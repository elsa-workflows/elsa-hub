// Writes the Elsa 4 preview page as a crawler-readable HTML artifact.
// The normal /elsa-4 SPA route remains the canonical browser destination.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildElsa4PreviewBody, buildElsa4PreviewHead } from "../src/lib/elsa4Preview";
import { injectIntoShell } from "./prerender-shell";

const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");
const OUT_PATH = resolve(DIST, "elsa-4.html");

export async function prerenderElsa4Preview(): Promise<void> {
  if (!existsSync(SHELL_PATH)) {
    throw new Error(`[prerender-elsa4-preview] ${SHELL_PATH} not found`);
  }

  const shell = readFileSync(SHELL_PATH, "utf-8");
  const html = injectIntoShell(shell, buildElsa4PreviewHead(), buildElsa4PreviewBody());
  writeFileSync(OUT_PATH, html, "utf-8");
  console.log(`[prerender-elsa4-preview] wrote ${OUT_PATH}`);
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
  prerenderElsa4Preview().catch((e) => {
    console.error(`[prerender-elsa4-preview] ${(e as Error).message}`);
    process.exit(1);
  });
}
