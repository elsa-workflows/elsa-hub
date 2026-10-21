/**
 * The origin a Stripe redirect may send the browser back to.
 *
 * Return URLs are built from the request's Origin header, which any caller can
 * set. Only the Hub's own hosts are trusted: the two production hosts the Hub
 * is served from, and localhost for local development. Anything else,
 * including a missing or unparseable Origin, gets the site: SITE_URL when it
 * is set, or the production URL main's Hub checkout already falls back to.
 * A SITE_URL that is not an http(s) URL is logged once and ignored, so a
 * misconfigured secret cannot fail every Cloud checkout and portal call.
 */

import type { EnvReader } from "./stripe-customer.ts";

/** Main's existing fallback for Hub checkout, the portal and emails. */
export const DEFAULT_SITE_URL = "https://elsa-hub.lovable.app";

/** The canonical host, as in src/lib/site.ts's SITE_URL (a parity test holds this), and the Lovable host. */
export const HUB_ORIGINS = ["https://www.elsaworkflows.io", DEFAULT_SITE_URL];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const WEB_PROTOCOLS = ["http:", "https:"];

/** The last invalid SITE_URL logged, so a bad secret is reported once, not on every request. */
let loggedInvalidSiteUrl: string | undefined;

function siteOrigin(env: EnvReader): string {
  const configured = env.get("SITE_URL");
  if (!configured) return DEFAULT_SITE_URL;
  try {
    const url = new URL(configured);
    if (WEB_PROTOCOLS.includes(url.protocol)) return url.origin;
  } catch {
    // Reported below.
  }
  if (loggedInvalidSiteUrl !== configured) {
    loggedInvalidSiteUrl = configured;
    console.error(`SITE_URL ${JSON.stringify(configured)} is not an http(s) URL; using ${DEFAULT_SITE_URL}`);
  }
  return DEFAULT_SITE_URL;
}

export function trustedSiteOrigin(req: Request, env: EnvReader = Deno.env): string {
  const site = siteOrigin(env);
  let requested: URL;
  try {
    requested = new URL(req.headers.get("origin") ?? "");
  } catch {
    return site;
  }
  if (HUB_ORIGINS.includes(requested.origin)) return requested.origin;
  if (LOCAL_HOSTS.has(requested.hostname) && WEB_PROTOCOLS.includes(requested.protocol)) {
    return requested.origin;
  }
  return site;
}
