// Postbuild: write a fully-rendered Training HTML file so crawlers see
// title, meta, canonical, OG/Twitter, JSON-LD, H1 and intro without JS.
// The SPA still hydrates over #root (createRoot() clears it on mount).
// Output is dist/elsa-plus/training/index.html so static hosts serve
// /elsa-plus/training from that directory index. The repo has no
// vercel/netlify _redirects; Lovable serves existing files first.
//
// This script is a standalone build step. It must not be gated on the
// blog prerender (a failed blog index fetch must not skip Training).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildTrainingBody, buildTrainingHead } from "../src/lib/trainingSeo";
import { injectIntoShell } from "./prerender-shell";

const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");
const OUT_PATH = resolve(DIST, "elsa-plus", "training", "index.html");

export async function prerenderTraining(): Promise<void> {
  if (!existsSync(SHELL_PATH)) {
    throw new Error(`[prerender-training] ${SHELL_PATH} not found`);
  }
  const shell = readFileSync(SHELL_PATH, "utf-8");
  const html = injectIntoShell(shell, buildTrainingHead(), buildTrainingBody());
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`[prerender-training] wrote ${OUT_PATH}`);
}

const isDirectRun = (() => {
  try {
    const argv1 = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : "";
    return import.meta.url === argv1;
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  prerenderTraining().catch((e) => {
    console.error(`[prerender-training] ${(e as Error).message}`);
    process.exit(1);
  });
}
