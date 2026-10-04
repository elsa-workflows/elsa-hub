import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { injectIntoShell } from "../../scripts/prerender-shell";

describe("prerender steps", () => {
  it("does not call Training from the blog prerender", () => {
    const blog = readFileSync(path.join(process.cwd(), "scripts/prerender-blog.ts"), "utf8");
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts: { postbuild: string };
    };
    expect(blog).not.toMatch(/prerenderTraining|prerender-training/);
    expect(pkg.scripts.postbuild).toMatch(/prerender-blog\.ts/);
    expect(pkg.scripts.postbuild).not.toMatch(/prerender-training/);
    const vite = readFileSync(path.join(process.cwd(), "vite.config.ts"), "utf8");
    expect(vite).toMatch(/prerenderTraining/);
  });

  it("strips data-rh shell tags before injecting route head", () => {
    const shell = `<!doctype html><html><head>
    <title>Old</title>
    <meta data-rh="true" name="description" content="old" />
    <meta data-rh="true" property="og:title" content="old" />
    <meta data-rh="true" property="og:image" content="https://www.elsaworkflows.io/og-default.png" />
    <meta data-rh="true" property="og:image:width" content="1200" />
    <meta data-rh="true" property="og:image:height" content="630" />
    <meta data-rh="true" name="twitter:card" content="summary_large_image" />
  </head><body><div id="root"></div></body></html>`;
    const html = injectIntoShell(
      shell,
      '<title data-rh="true">New</title>',
      "<h1>Hi</h1>",
    );
    expect(html).not.toContain(">Old<");
    expect(html).not.toMatch(/name="description"/);
    expect(html).not.toMatch(/property="og:title"/);
    expect(html).not.toMatch(/property="og:image"/);
    expect(html).not.toMatch(/property="og:image:width"/);
    expect(html).not.toMatch(/property="og:image:height"/);
    expect(html).not.toMatch(/name="twitter:card"/);
    expect(html).toContain('<title data-rh="true">New</title>');
    expect(html).toContain("<h1>Hi</h1>");
  });
});
