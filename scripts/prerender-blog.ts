// Postbuild: fetch every blog post and write a fully-rendered HTML file
// per slug into dist/blog/<slug>.
//
// Why: the SPA route renders post content client-side, which means
// Medium's "Import a story", LinkedIn previews, and other non-JS
// crawlers see an empty shell. By writing real HTML at build time we
// give them a proper <article>, OG tags and JSON-LD, while the React
// app still hydrates over it (the content lives inside <div id="root">,
// which createRoot() clears on mount).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const UPSTREAM = "https://elsa-workflows.github.io/elsa-blog";
const SITE = "https://www.elsa-workflows.io";
const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");

interface Author { name: string; url?: string; avatar?: string; title?: string }
interface PostSummary {
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
  seo?: { title?: string; description?: string; openGraphImage?: string };
}
interface Post extends PostSummary { html: string }

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHead(post: Post, canonical: string): string {
  const seoTitle = post.seo?.title || post.title;
  const seoDescription = post.seo?.description || post.description || "";
  const ogImage = post.seo?.openGraphImage || post.featuredImage;
  const pageTitle = `${seoTitle} — Elsa Workflows`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: seoDescription,
    image: ogImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: (post.authors || []).map((a) => ({ "@type": "Person", name: a.name, url: a.url })),
    mainEntityOfPage: canonical,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return [
    `<title>${esc(pageTitle)}</title>`,
    seoDescription ? `<meta name="description" content="${esc(seoDescription)}" />` : "",
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${esc(seoTitle)}" />`,
    seoDescription ? `<meta property="og:description" content="${esc(seoDescription)}" />` : "",
    `<meta property="og:url" content="${esc(canonical)}" />`,
    ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />` : "",
    post.publishedAt ? `<meta property="article:published_time" content="${esc(post.publishedAt)}" />` : "",
    post.updatedAt ? `<meta property="article:modified_time" content="${esc(post.updatedAt)}" />` : "",
    ...(post.authors || []).map((a) => `<meta property="article:author" content="${esc(a.name)}" />`),
    post.category ? `<meta property="article:section" content="${esc(post.category)}" />` : "",
    ...(post.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}" />`),
    `<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(seoTitle)}" />`,
    seoDescription ? `<meta name="twitter:description" content="${esc(seoDescription)}" />` : "",
    ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}" />` : "",
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    `<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>`,
  ].filter(Boolean).join("\n    ");
}

function absolutizeAssetUrls(html: string): string {
  if (!html) return html;
  return html.replace(
    /(\b(?:src|href)=")(?:\.\.\/|\.\/)?(assets\/[^"]+)(")/gi,
    (_m, pre, path, post) => `${pre}${UPSTREAM}/${path}${post}`,
  );
}

function buildArticle(post: Post): string {
  const authors = (post.authors || []).map((a) => a.name).filter(Boolean).join(", ");
  const date = post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "";
  return `<article data-prerendered="true">
  <h1>${esc(post.title)}</h1>
  <p><em>${authors ? `By ${esc(authors)}` : ""}${authors && date ? " · " : ""}${date}</em></p>
  ${post.featuredImage ? `<p><img src="${esc(post.featuredImage)}" alt="${esc(post.title)}" /></p>` : ""}
  ${post.description ? `<p><strong>${esc(post.description)}</strong></p>` : ""}
  ${absolutizeAssetUrls(post.html)}
</article>`;
}

function injectIntoShell(shell: string, headExtras: string, articleHtml: string): string {
  // Strip the static <title> and sitewide <meta name="description"> so the
  // per-post versions are the only ones in the document.
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*\/?>/i, "")
    .replace(/<meta\s+property="og:(title|description|url|type|image)"[^>]*\/?>/gi, "")
    .replace(/<meta\s+name="twitter:(title|description|image|card)"[^>]*\/?>/gi, "");

  html = html.replace(/<\/head>/i, `    ${headExtras}\n  </head>`);

  // React's createRoot().render() clears children of #root on mount, so the
  // prerendered article naturally disappears once the SPA hydrates.
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${articleHtml}</div>`,
  );

  return html;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function prerenderBlog(): Promise<void> {
  if (!existsSync(SHELL_PATH)) {
    console.warn(`[prerender-blog] ${SHELL_PATH} not found, skipping.`);
    return;
  }
  const shell = readFileSync(SHELL_PATH, "utf-8");

  let index: { posts: PostSummary[] };
  try {
    index = await fetchJson<{ posts: PostSummary[] }>(`${UPSTREAM}/index.json`);
  } catch (e) {
    console.warn(`[prerender-blog] couldn't fetch blog index: ${(e as Error).message}. Skipping.`);
    return;
  }

  const posts = index.posts || [];
  let ok = 0;
  let failed = 0;

  for (const summary of posts) {
    try {
      const post = await fetchJson<Post>(`${UPSTREAM}/posts/${encodeURIComponent(summary.slug)}.json`);
      const canonical = post.canonicalUrl || `${SITE}/blog/${post.slug}`;
      const headExtras = buildHead(post, canonical);
      const article = buildArticle(post);
      const html = injectIntoShell(shell, headExtras, article);

      // Lovable hosting serves exact file-path matches before SPA fallback.
      // For a request like /blog/my-post it does not appear to resolve the
      // directory form /blog/my-post/index.html, so we emit an extensionless
      // file at the exact route path instead.
      const outPath = resolve(DIST, "blog", post.slug);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html, "utf-8");
      ok++;
    } catch (e) {
      failed++;
      console.warn(`[prerender-blog] ${summary.slug} failed: ${(e as Error).message}`);
    }
  }

  console.log(`[prerender-blog] wrote ${ok} post(s), ${failed} failed.`);
}

// Allow running this file directly via `tsx scripts/prerender-blog.ts`.
const isDirectRun = (() => {
  try {
    const argv1 = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : "";
    return import.meta.url === argv1;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  prerenderBlog().catch((e) => {
    console.warn(`[prerender-blog] unexpected error: ${(e as Error).message}`);
  });
}
