import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("generate-sitemap public Academy courses", () => {
  it("lists the published Solo Bundle course URLs next to /academy", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/generate-sitemap.ts"), "utf8");
    expect(source).toContain('{ path: "/academy", changefreq: "weekly", priority: "0.8" }');
    expect(source).toContain('{ path: "/academy/fundamentals-core", changefreq: "weekly", priority: "0.7" }');
    expect(source).toContain('{ path: "/academy/fundamentals-complete", changefreq: "weekly", priority: "0.7" }');
    expect(source).toContain('{ path: "/academy/advanced-patterns", changefreq: "weekly", priority: "0.7" }');
  });
});
