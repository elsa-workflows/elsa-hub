import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blogPrerenderPaths, buildHead } from "../../scripts/prerender-blog";
import { injectIntoShell, prerenderOutputPaths } from "../../scripts/prerender-shell";
import { ELSA4_OUT_PATHS } from "../../scripts/prerender-elsa4-preview";

const SHELL = `<!doctype html><html><head>
    <meta charset="UTF-8" />
    <title>The workflow and BPMN engine for .NET</title>
    <meta data-rh="true" name="description" content="site" />
    <meta data-rh="true" property="og:title" content="The workflow and BPMN engine for .NET" />
    <meta data-rh="true" property="og:description" content="site" />
    <meta data-rh="true" property="og:type" content="website" />
    <meta data-rh="true" property="og:url" content="https://www.elsaworkflows.io/" />
    <meta data-rh="true" property="og:image" content="https://www.elsaworkflows.io/og-default.png" />
    <meta data-rh="true" property="og:image:width" content="1200" />
    <meta data-rh="true" property="og:image:height" content="630" />
    <link rel="canonical" href="https://www.elsaworkflows.io/" />
    <meta data-rh="true" name="twitter:card" content="summary_large_image" />
    <meta data-rh="true" name="twitter:title" content="The workflow and BPMN engine for .NET" />
    <meta data-rh="true" name="twitter:description" content="site" />
    <meta data-rh="true" name="twitter:image" content="https://www.elsaworkflows.io/og-default.png" />
  </head><body><div id="root"></div></body></html>`;

interface TestPost {
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  featuredImage?: string;
  seo?: { title?: string; description?: string };
  html: string;
}

const post: TestPost = {
  slug: "elsa-4-transactional-outbox",
  title: "Inside Elsa 4's Transactional Outbox",
  description: "Long description",
  publishedAt: "2026-10-25",
  featuredImage: "https://elsa-workflows.github.io/elsa-blog/assets/x/featured.png",
  seo: { title: 'Outbox "quoted" & <b>', description: "Short </script> description" },
  html: "<p>Body</p>",
};

function render(p: TestPost = post) {
  return injectIntoShell(SHELL, buildHead(p), "<article></article>");
}

function count(html: string, re: RegExp) {
  return (html.match(re) || []).length;
}

describe("prerender-blog head", () => {
  it("emits one of each per-post social tag and drops the site defaults", () => {
    const html = render();
    for (const re of [
      /property="og:title"/g,
      /property="og:description"/g,
      /property="og:image"/g,
      /property="og:url"/g,
      /property="og:type"/g,
      /name="twitter:card"/g,
      /name="twitter:title"/g,
      /name="twitter:description"/g,
      /name="twitter:image"/g,
      /rel="canonical"/g,
      /<title/g,
    ]) {
      expect(count(html, re)).toBe(1);
    }
    expect(html).not.toContain("The workflow and BPMN engine for .NET");
    expect(html).not.toContain("og-default.png");
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:image" content="https://elsa-workflows.github.io/elsa-blog/assets/x/featured.png"');
    expect(html).toContain('property="og:url" content="https://www.elsaworkflows.io/blog/elsa-4-transactional-outbox"');
    expect(html).toContain('rel="canonical" href="https://www.elsaworkflows.io/blog/elsa-4-transactional-outbox"');
  });

  it("HTML-escapes values and keeps JSON-LD inside its script tag", () => {
    const html = render();
    expect(html).toContain('property="og:title" content="Outbox &quot;quoted&quot; &amp; &lt;b&gt;"');
    expect(html).toContain('name="twitter:description" content="Short &lt;/script&gt; description"');
    expect(html).not.toContain("Short </script> description");
  });

  it("falls back to title, description and the default image", () => {
    const { seo: _seo, featuredImage: _image, ...plain } = post;
    const html = render(plain);
    expect(html).toContain(`property="og:title" content="Inside Elsa 4's Transactional Outbox"`);
    expect(html).toContain('property="og:description" content="Long description"');
    expect(html).toContain('property="og:image" content="https://www.elsaworkflows.io/og-default.png"');
    expect(count(html, /property="og:image:width"/g)).toBe(1);
  });

  it("marks tags as Helmet-managed so the client replaces rather than duplicates them", () => {
    const head = buildHead(post);
    const tags = head.split("\n").map((l) => l.trim()).filter(Boolean);
    expect(tags.every((t) => t.includes('data-rh="true"'))).toBe(true);
  });

  it("writes both /blog/<slug>.html and /blog/<slug>/index.html", () => {
    expect(blogPrerenderPaths("/d", "a")).toEqual([resolve("/d/blog/a.html"), resolve("/d/blog/a/index.html")]);
  });

  it("writes /elsa-4 as elsa-4.html and elsa-4/index.html", () => {
    expect(prerenderOutputPaths("/d", "/elsa-4/")).toEqual([resolve("/d/elsa-4.html"), resolve("/d/elsa-4/index.html")]);
    expect(ELSA4_OUT_PATHS[1]).toBe(resolve("dist/elsa-4/index.html"));
  });
});
