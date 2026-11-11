import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const functions = join(here, "..", "..", "supabase", "functions");

// Edge Functions that build a Stripe return URL. None may take the host from
// the request's Origin header (elsa-hub#192): they go through trustedSiteOrigin.
const RETURN_URL_FILES = [
  "academy-checkout/handler.ts",
  "create-checkout-session/index.ts",
  "create-checkout-session/cloud.ts",
  "customer-portal/index.ts",
  "customer-portal/cloud.ts",
];

describe("Stripe return URLs use the trusted site origin", () => {
  it.each(RETURN_URL_FILES)("%s does not read the Origin header or hardcode a Lovable fallback", (file) => {
    const source = readFileSync(join(functions, file), "utf8");
    expect(source).toContain("trustedSiteOrigin(");
    expect(source).not.toMatch(/headers\.get\(\s*["']origin["']\s*\)/i);
    expect(source).not.toContain("elsa-hub.lovable.app");
  });

  it("the shared helper's default is the canonical host", () => {
    const source = readFileSync(join(functions, "_shared", "site-origin.ts"), "utf8");
    expect(source).toContain('export const DEFAULT_SITE_URL = "https://www.elsaworkflows.io";');
  });
});
