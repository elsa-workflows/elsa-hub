// Writes the Elsa 4 preview page as a crawler-readable HTML artifact.
// Production serves /elsa-4 from elsa-4/index.html; the React app hydrates
// over it. elsa-4.html is kept for existing links.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildElsa4PreviewBody, buildElsa4PreviewHead } from "../src/lib/elsa4Preview";
import { injectIntoShell, prerenderOutputPaths } from "./prerender-shell";

const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");
/** dist/elsa-4.html and dist/elsa-4/index.html (the one /elsa-4 is served from). */
export const ELSA4_OUT_PATHS = prerenderOutputPaths(DIST, "elsa-4");

export async function prerenderElsa4Preview(): Promise<void> {
  if (!existsSync(SHELL_PATH)) {
    throw new Error(`[prerender-elsa4-preview] ${SHELL_PATH} not found`);
  }

  const shell = readFileSync(SHELL_PATH, "utf-8");
  const html = injectIntoShell(shell, buildElsa4PreviewHead(), buildElsa4PreviewBody());
  for (const outPath of ELSA4_OUT_PATHS) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf-8");
    console.log(`[prerender-elsa4-preview] wrote ${outPath}`);
  }
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
