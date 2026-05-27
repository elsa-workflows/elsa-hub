// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.elsa-workflows.io";
const BLOG_UPSTREAM = "https://elsa-workflows.github.io/elsa-blog";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/get-started", changefreq: "monthly", priority: "0.9" },
  { path: "/get-started/elsa-server", changefreq: "monthly", priority: "0.8" },
  { path: "/get-started/elsa-studio", changefreq: "monthly", priority: "0.8" },
  { path: "/get-started/elsa-server-and-studio", changefreq: "monthly", priority: "0.8" },
  { path: "/get-started/docker", changefreq: "monthly", priority: "0.8" },
  { path: "/elsa-plus", changefreq: "weekly", priority: "0.9" },
  { path: "/elsa-plus/expert-services", changefreq: "weekly", priority: "0.8" },
  { path: "/elsa-plus/expert-services/valence-works", changefreq: "monthly", priority: "0.7" },
  { path: "/elsa-plus/docker-images", changefreq: "weekly", priority: "0.8" },
  { path: "/elsa-plus/docker-images/elsa-pro-server", changefreq: "monthly", priority: "0.7" },
  { path: "/elsa-plus/docker-images/elsa-pro-studio", changefreq: "monthly", priority: "0.7" },
  { path: "/elsa-plus/docker-images/elsa-pro-combined", changefreq: "monthly", priority: "0.7" },
  { path: "/elsa-plus/cloud-services", changefreq: "monthly", priority: "0.7" },
  { path: "/elsa-plus/training", changefreq: "monthly", priority: "0.7" },
  { path: "/elsa-plus/runtime-builder", changefreq: "weekly", priority: "0.8" },
  { path: "/resources", changefreq: "weekly", priority: "0.8" },
  { path: "/resources/community-content", changefreq: "weekly", priority: "0.7" },
  { path: "/roadmap", changefreq: "weekly", priority: "0.8" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/signup", changefreq: "yearly", priority: "0.4" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function fetchBlogEntries(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${BLOG_UPSTREAM}/index.json`);
    if (!res.ok) throw new Error(`index ${res.status}`);
    const data = (await res.json()) as { posts?: Array<{ slug: string; publishedAt?: string; updatedAt?: string }> };
    const posts = data.posts || [];
    const list: SitemapEntry[] = [
      { path: "/blog", changefreq: "weekly", priority: "0.8" },
      ...posts.map((p) => ({
        path: `/blog/${p.slug}`,
        changefreq: "monthly" as const,
        priority: "0.7",
        lastmod: (p.updatedAt || p.publishedAt || "").slice(0, 10) || undefined,
      })),
    ];
    return list;
  } catch (e) {
    console.warn(`sitemap: blog fetch failed (${(e as Error).message}); skipping blog entries.`);
    return [{ path: "/blog", changefreq: "weekly", priority: "0.8" }];
  }
}

const blogEntries = await fetchBlogEntries();
const allEntries = [...entries, ...blogEntries];

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(allEntries));
console.log(`sitemap.xml written (${allEntries.length} entries)`);
