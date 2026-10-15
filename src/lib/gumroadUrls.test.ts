import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FUNDAMENTALS_CORE_GUMROAD_URL } from "./trainingInterest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("Gumroad URLs in src/", () => {
  it("allows only the Team pack constant and its test assertion until Hub Team ships", () => {
    const srcRoot = path.join(process.cwd(), "src");
    const urlRe = /https?:\/\/[^\s"'`<>]*gumroad\.com[^\s"'`<>]*/gi;
    const hits: { rel: string; url: string }[] = [];

    for (const file of walk(srcRoot)) {
      const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(urlRe)) {
        hits.push({ rel, url: match[0] });
      }
    }

    expect(hits.every((hit) => hit.url === FUNDAMENTALS_CORE_GUMROAD_URL)).toBe(true);
    expect([...new Set(hits.map((hit) => hit.rel))].sort()).toEqual([
      "src/lib/trainingInterest.test.ts",
      "src/lib/trainingInterest.ts",
    ]);
    expect(hits).toHaveLength(2);
  });

  it("uses the Team constant once on the Training page", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/pages/enterprise/Training.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/gumroad\.com/i);
    expect(source.match(/FUNDAMENTALS_CORE_GUMROAD_URL/g)).toEqual([
      "FUNDAMENTALS_CORE_GUMROAD_URL",
      "FUNDAMENTALS_CORE_GUMROAD_URL",
    ]);
    expect(source).toMatch(/<BuyCta href=\{FUNDAMENTALS_CORE_GUMROAD_URL\} label="Buy a Team pack" \/>/);
  });
});
