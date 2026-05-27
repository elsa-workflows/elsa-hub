// Public endpoint: server-rendered HTML / Markdown / JSON for a blog post.
// NOTE: Supabase's edge gateway forces `text/plain` + a sandbox CSP on every
// response, so Medium's importer (which requires real text/html) cannot use
// the HTML output of this function directly. The HTML/MD output is still
// useful for curl, manual inspection, and the Markdown download.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
// @ts-ignore esm.sh
import TurndownService from "https://esm.sh/turndown@7.2.0";

const UPSTREAM = "https://elsa-workflows.github.io/elsa-blog";
const CANONICAL_BASE = "https://www.elsaworkflows.io/blog";

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

    const cache = "public, max-age=300, s-maxage=300";
    const linkHeader = `<${canonical}>; rel="canonical"`;

    if (format === "json") {
      return new Response(JSON.stringify(post, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, Link: linkHeader },
      });
    }
    if (format === "md" || format === "markdown") {
      return new Response(renderMarkdown(post, canonical), {
        headers: { ...corsHeaders, "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": cache, Link: linkHeader },
      });
    }
    return new Response(renderHtml(post, canonical), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": cache, Link: linkHeader },
    });
  } catch (e) {
    return new Response(`Failed to export post: ${(e as Error).message}`, {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

