// Public endpoint: server-rendered HTML / Markdown / JSON for a blog post.
// Workaround: Supabase edge gateway forces text/plain + sandbox CSP on all
// edge-function responses, which breaks Medium's importer. So we render the
// content, upload it to a public Storage bucket (which serves the correct
// content-type with no CSP), and 302-redirect to it.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-ignore esm.sh
import TurndownService from "https://esm.sh/turndown@7.2.0";

const UPSTREAM = "https://elsa-workflows.github.io/elsa-blog";
const CANONICAL_BASE = "https://www.elsaworkflows.io/blog";
const BUCKET = "blog-exports";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Author { name: string; url?: string; title?: string; avatar?: string }
interface Post {
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  category?: string;
  tags?: string[];
  authors?: Author[];
  featuredImage?: string;
  canonicalUrl?: string;
  html: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderHtml(post: Post, canonical: string): string {
  const authors = (post.authors || []).map((a) => a.name).filter(Boolean).join(", ");
  const dateLine = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(post.title)}</title>
${post.description ? `<meta name="description" content="${esc(post.description)}" />` : ""}
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(post.title)}" />
${post.description ? `<meta property="og:description" content="${esc(post.description)}" />` : ""}
<meta property="og:url" content="${esc(canonical)}" />
${post.featuredImage ? `<meta property="og:image" content="${esc(post.featuredImage)}" />` : ""}
${post.publishedAt ? `<meta property="article:published_time" content="${esc(post.publishedAt)}" />` : ""}
${post.updatedAt ? `<meta property="article:modified_time" content="${esc(post.updatedAt)}" />` : ""}
${(post.authors || []).map((a) => `<meta property="article:author" content="${esc(a.name)}" />`).join("\n")}
${(post.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}" />`).join("\n")}
</head>
<body>
<article>
<h1>${esc(post.title)}</h1>
<p><em>${authors ? `By ${esc(authors)}` : ""}${authors && dateLine ? " · " : ""}${dateLine}</em></p>
${post.featuredImage ? `<p><img src="${esc(post.featuredImage)}" alt="${esc(post.title)}" /></p>` : ""}
${post.description ? `<p><strong>${esc(post.description)}</strong></p>` : ""}
${post.html}
</article>
</body>
</html>`;
}

function renderMarkdown(post: Post, canonical: string): string {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  const body = td.turndown(post.html || "");
  const authors = (post.authors || []).map((a) => a.name).filter(Boolean).join(", ");
  const date = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "";
  const front = [
    "---",
    `title: ${JSON.stringify(post.title)}`,
    post.description ? `description: ${JSON.stringify(post.description)}` : "",
    date ? `date: ${date}` : "",
    authors ? `authors: ${JSON.stringify(authors)}` : "",
    post.category ? `category: ${JSON.stringify(post.category)}` : "",
    post.tags?.length ? `tags: [${post.tags.map((t) => JSON.stringify(t)).join(", ")}]` : "",
    `canonical: ${canonical}`,
    "---",
    "",
  ].filter(Boolean).join("\n");
  const cover = post.featuredImage ? `![${post.title.replace(/[\[\]]/g, "")}](${post.featuredImage})\n\n` : "";
  return `${front}\n# ${post.title}\n\n${cover}${body}\n`;
}

function publicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function uploadAndRedirect(
  path: string,
  body: string,
  contentType: string,
  canonical: string,
): Promise<Response> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await admin.storage.from(BUCKET).upload(path, new Blob([body], { type: contentType }), {
    contentType,
    upsert: true,
    cacheControl: "300",
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const target = publicUrl(path);
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: target,
      Link: `<${canonical}>; rel="canonical"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const slug = last && last !== "blog-export" ? last : "";
  const format = (url.searchParams.get("format") || "html").toLowerCase();

  if (!slug) {
    return new Response("Missing slug. Use /blog-export/<slug>?format=html|md|json", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const upstream = await fetch(`${UPSTREAM}/posts/${encodeURIComponent(slug)}.json`);
    if (upstream.status === 404) {
      return new Response("Post not found", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);
    const post = (await upstream.json()) as Post;
    const canonical = post.canonicalUrl || `${CANONICAL_BASE}/${slug}`;

    if (format === "json") {
      // JSON is fine via the edge gateway (no HTML sniffing), return inline.
      return new Response(JSON.stringify(post, null, 2), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=300",
          Link: `<${canonical}>; rel="canonical"`,
        },
      });
    }

    if (format === "md" || format === "markdown") {
      const body = renderMarkdown(post, canonical);
      return await uploadAndRedirect(`${slug}.md`, body, "text/markdown; charset=utf-8", canonical);
    }

    // Default: HTML — must be served from Storage so Medium gets real text/html
    // without the edge gateway's sandbox CSP.
    const body = renderHtml(post, canonical);
    return await uploadAndRedirect(`${slug}.html`, body, "text/html; charset=utf-8", canonical);
  } catch (e) {
    return new Response(`Failed to export post: ${(e as Error).message}`, {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
