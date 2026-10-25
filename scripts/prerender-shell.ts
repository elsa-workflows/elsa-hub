import { resolve } from "node:path";

// Shared postbuild helper: drop the SPA shell's default title/social tags
// and inject route-specific head + #root markup.

export function injectIntoShell(shell: string, headExtras: string, bodyHtml: string): string {
  let html = shell
    .replace(/<title[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(?:[^>]*\s)?name="description"[^>]*\/?>/i, "")
    .replace(/<meta\s+(?:[^>]*\s)?property="og:(title|description|url|type|image(?::width|:height)?|site_name)"[^>]*\/?>/gi, "")
    .replace(/<meta\s+(?:[^>]*\s)?name="twitter:(title|description|image|card)"[^>]*\/?>/gi, "")
    .replace(/<link\s+(?:[^>]*\s)?rel="canonical"[^>]*\/?>/gi, "");

  html = html.replace(/<\/head>/i, `    ${headExtras}\n  </head>`);
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );
  return html;
}

/**
 * Files to write for a prerendered route such as "elsa-4" or "blog/<slug>".
 *
 * Production (Lovable/Cloudflare) serves /<route> from <route>/index.html
 * when it exists and otherwise falls back to the SPA shell with the site
 * default title and OG image; it never maps /<route> to <route>.html. So the
 * folder index is what shared links resolve to. <route>.html is kept for
 * existing links and importers (e.g. Medium) that use the .html URL.
 */
export function prerenderOutputPaths(dist: string, route: string): string[] {
  const clean = route.replace(/^\/+|\/+$/g, "");
  return [resolve(dist, `${clean}.html`), resolve(dist, clean, "index.html")];
}
