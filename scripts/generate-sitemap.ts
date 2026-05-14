// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.elsa-workflows.io";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
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
  { path: "/resources", changefreq: "weekly", priority: "0.8" },
  { path: "/resources/community-content", changefreq: "weekly", priority: "0.7" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/signup", changefreq: "yearly", priority: "0.4" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
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

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
