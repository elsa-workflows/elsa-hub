// Shared postbuild helper: drop the SPA shell's default title/social tags
// and inject route-specific head + #root markup.

export function injectIntoShell(shell: string, headExtras: string, bodyHtml: string): string {
  let html = shell
    .replace(/<title[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(?:[^>]*\s)?name="description"[^>]*\/?>/i, "")
    .replace(/<meta\s+(?:[^>]*\s)?property="og:(title|description|url|type|image|site_name)"[^>]*\/?>/gi, "")
    .replace(/<meta\s+(?:[^>]*\s)?name="twitter:(title|description|image|card)"[^>]*\/?>/gi, "");

  html = html.replace(/<\/head>/i, `    ${headExtras}\n  </head>`);
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${bodyHtml}</div>`,
  );
  return html;
}
