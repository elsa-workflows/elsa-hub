// Postbuild: write a fully-rendered Training HTML file so crawlers see
// title, meta, canonical, OG/Twitter, JSON-LD, H1 and intro without JS.
// The SPA still hydrates over #root (createRoot() clears it on mount).
// Output is dist/elsa-plus/training/index.html so static hosts serve
// /elsa-plus/training from that directory index. The repo has no
// vercel/netlify _redirects; Lovable serves existing files first.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildTrainingBody, buildTrainingHead } from "../src/lib/trainingSeo";

const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");
const OUT_PATH = resolve(DIST, "elsa-plus", "training", "index.html");

function injectIntoShell(shell: string, headExtras: string, bodyHtml: string): string {
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*\/?>/i, "")
    .replace(/<meta\s+property="og:(title|description|url|type|image|site_name)"[^>]*\/?>/gi, "")
    .replace(/<meta\s+name="twitter:(title|description|image|card)"[^>]*\/?>/gi, "");

  html = html.replace(/<\/head>/i, `    ${headExtras}\n  </head>`);
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );
  return html;
}

export async function prerenderTraining(): Promise<void> {
  if (!existsSync(SHELL_PATH)) {
    console.warn(`[prerender-training] ${SHELL_PATH} not found, skipping.`);
    return;
  }
  const shell = readFileSync(SHELL_PATH, "utf-8");
  const html = injectIntoShell(shell, buildTrainingHead(), buildTrainingBody());
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`[prerender-training] wrote ${OUT_PATH}`);
}
