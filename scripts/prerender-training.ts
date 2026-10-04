// Writes dist/elsa-plus/training/index.html.
//
// The live Lovable host serves exact file paths only. There is no
// _redirects file and no host rewrite. /elsa-plus/training/ may get this
// directory index if the host serves dir/index.html. /elsa-plus/training
// (no trailing slash) gets the SPA shell for clients that do not run JS.
// Googlebot renders JS, so it still sees the approved title, description,
// H1, canonical, and Course JSON-LD from the SPA.
//
// The SPA hydrates over #root (createRoot() clears it on mount).
// This step is independent of the blog prerender: a failed blog index
// fetch must not skip Training.

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
