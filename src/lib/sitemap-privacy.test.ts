import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("generate-sitemap Cloud Privacy Notice", () => {
  it("lists /legal/privacy next to the other Hub legal pages", () => {
    const source = readFileSync(path.join(process.cwd(), "scripts/generate-sitemap.ts"), "utf8");
    expect(source).toContain('{ path: "/legal/cloud-terms", changefreq: "yearly", priority: "0.3" }');
    expect(source).toContain('{ path: "/legal/privacy", changefreq: "yearly", priority: "0.3" }');
    expect(source).toContain('{ path: "/legal/dpa", changefreq: "yearly", priority: "0.3" }');
  });
});
