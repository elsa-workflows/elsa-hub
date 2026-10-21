import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DEFAULT_SITE_URL, trustedSiteOrigin } from "./site-origin.ts";

const env = (siteUrl?: string) => ({ get: (key: string) => (key === "SITE_URL" ? siteUrl : undefined) });
const request = (origin?: string) => new Request("https://functions.example/x", origin ? { headers: { origin } } : {});

for (
  const [name, origin, expected] of [
    ["the site's own origin", "https://hub.example", "https://hub.example"],
    ["the canonical Hub host", "https://www.elsaworkflows.io", "https://www.elsaworkflows.io"],
    ["the Lovable Hub host", "https://elsa-hub.lovable.app", "https://elsa-hub.lovable.app"],
    ["another Lovable host", "https://attacker.lovable.app", "https://hub.example"],
    ["http localhost on any port", "http://localhost:8080", "http://localhost:8080"],
    ["https localhost", "https://localhost:5173", "https://localhost:5173"],
    ["http 127.0.0.1", "http://127.0.0.1:3000", "http://127.0.0.1:3000"],
    ["a foreign host", "https://attacker.example", "https://hub.example"],
    ["a host that only starts with the site's", "https://hub.example.attacker.example", "https://hub.example"],
    ["a host that only starts with localhost", "http://localhost.attacker.example", "https://hub.example"],
    ["the site's host over http", "http://hub.example", "https://hub.example"],
    ["an unparseable origin", "not a url", "https://hub.example"],
    ["the opaque null origin", "null", "https://hub.example"],
    ["no origin", undefined, "https://hub.example"],
  ] as const
) {
  Deno.test(`${name} resolves to ${expected}`, () => {
    assertEquals(trustedSiteOrigin(request(origin), env("https://hub.example/")), expected);
  });
}

Deno.test("without SITE_URL the site is the Hub's production URL", () => {
  assertEquals(trustedSiteOrigin(request("https://attacker.example"), env()), DEFAULT_SITE_URL);
  assertEquals(trustedSiteOrigin(request(DEFAULT_SITE_URL), env()), DEFAULT_SITE_URL);
});
