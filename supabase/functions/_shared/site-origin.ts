/**
 * The origin a Stripe redirect may send the browser back to.
 *
 * Return URLs are built from the request's Origin header, which any caller can
 * set. Only the Hub's own hosts are trusted: the two production hosts the Hub
 * is served from, and localhost for local development. Anything else,
 * including a missing or unparseable Origin, gets the site: SITE_URL when it
 * is set, or the production URL main's Hub checkout already falls back to.
 */

import type { EnvReader } from "./stripe-customer.ts";

/** Main's existing fallback for Hub checkout, the portal and emails. */
export const DEFAULT_SITE_URL = "https://elsa-hub.lovable.app";

/** The canonical host, as in src/lib/site.ts's SITE_URL, and the Lovable host. */
const HUB_ORIGINS = ["https://www.elsaworkflows.io", DEFAULT_SITE_URL];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function trustedSiteOrigin(req: Request, env: EnvReader = Deno.env): string {
  const site = new URL(env.get("SITE_URL") || DEFAULT_SITE_URL).origin;
  let requested: URL;
  try {
    requested = new URL(req.headers.get("origin") ?? "");
  } catch {
    return site;
  }
  if (HUB_ORIGINS.includes(requested.origin)) return requested.origin;
  if (LOCAL_HOSTS.has(requested.hostname) && ["http:", "https:"].includes(requested.protocol)) {
    return requested.origin;
  }
  return site;
}
