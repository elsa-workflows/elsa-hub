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
import {
  SITE_OG_IMAGE_HEIGHT,
  SITE_OG_IMAGE_WIDTH,
  SITE_TWITTER_CARD,
  SITE_URL,
} from "../src/lib/site";
import { BLOG_UPSTREAM_URL, blogPostSeo } from "../src/lib/blogSeo";
import { injectIntoShell } from "./prerender-shell";

const UPSTREAM = BLOG_UPSTREAM_URL;
const SITE = SITE_URL;
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
  seoTitle?: string;
  seoDescription?: string;
}
interface Post extends PostSummary { html: string }

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** JSON for an inline <script>: escape "<" so a value cannot close the tag. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Tags carry data-rh="true" so react-helmet-async treats them as its own and
// replaces them when BlogPost.tsx mounts, instead of adding duplicates.
export function buildHead(post: Post): string {
  const { canonical, title: seoTitle, description: seoDescription, image: ogImage, usingDefaultImage, pageTitle } =
    blogPostSeo(post);

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
    `<title data-rh="true">${esc(pageTitle)}</title>`,
    seoDescription ? `<meta data-rh="true" name="description" content="${esc(seoDescription)}" />` : "",
    `<link data-rh="true" rel="canonical" href="${esc(canonical)}" />`,
    `<meta data-rh="true" property="og:type" content="article" />`,
    `<meta data-rh="true" property="og:title" content="${esc(seoTitle)}" />`,
    seoDescription ? `<meta data-rh="true" property="og:description" content="${esc(seoDescription)}" />` : "",
    `<meta data-rh="true" property="og:url" content="${esc(canonical)}" />`,
    `<meta data-rh="true" property="og:image" content="${esc(ogImage)}" />`,
    usingDefaultImage ? `<meta data-rh="true" property="og:image:width" content="${SITE_OG_IMAGE_WIDTH}" />` : "",
    usingDefaultImage ? `<meta data-rh="true" property="og:image:height" content="${SITE_OG_IMAGE_HEIGHT}" />` : "",
    post.publishedAt ? `<meta data-rh="true" property="article:published_time" content="${esc(post.publishedAt)}" />` : "",
    post.updatedAt ? `<meta data-rh="true" property="article:modified_time" content="${esc(post.updatedAt)}" />` : "",
    ...(post.authors || []).map((a) => `<meta data-rh="true" property="article:author" content="${esc(a.name)}" />`),
    post.category ? `<meta data-rh="true" property="article:section" content="${esc(post.category)}" />` : "",
    ...(post.tags || []).map((t) => `<meta data-rh="true" property="article:tag" content="${esc(t)}" />`),
    `<meta data-rh="true" name="twitter:card" content="${SITE_TWITTER_CARD}" />`,
    `<meta data-rh="true" name="twitter:title" content="${esc(seoTitle)}" />`,
    seoDescription ? `<meta data-rh="true" name="twitter:description" content="${esc(seoDescription)}" />` : "",
    `<meta data-rh="true" name="twitter:image" content="${esc(ogImage)}" />`,
    `<script data-rh="true" type="application/ld+json">${jsonForScript(jsonLd)}</script>`,
    `<script data-rh="true" type="application/ld+json">${jsonForScript(breadcrumbLd)}</script>`,
  ].filter(Boolean).join("\n    ");
}

/** Files written for one post: /blog/<slug>.html and /blog/<slug>/index.html. */
export function blogPrerenderPaths(dist: string, slug: string): string[] {
  return [resolve(dist, "blog", `${slug}.html`), resolve(dist, "blog", slug, "index.html")];
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
      const headExtras = buildHead(post);
      const article = buildArticle(post);
      const html = injectIntoShell(shell, headExtras, article);

      // Emit as <slug>.html so the host serves it with text/html (an
      // extensionless file is served as application/octet-stream, which
      // browsers download). The SPA route /blog/<slug> still falls back to
      // index.html for normal users; crawlers and Medium's importer can use
      // the .html URL to get fully-rendered article markup.
      //
      // Production (Lovable/Cloudflare) serves /blog/<slug> from
      // blog/<slug>/index.html when it exists and otherwise falls back to the
      // SPA shell, whose default title and OG image LinkedIn then shows. So
      // write the directory index too; it is what shared links resolve to.
      for (const outPath of blogPrerenderPaths(DIST, post.slug)) {
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, html, "utf-8");
      }
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
