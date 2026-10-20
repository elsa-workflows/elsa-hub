import { ACADEMY_TERMS_INDEX_PATH } from "./academyLegal";

/** Short /terms URL used by older Cloud and external links. */
export const LEGACY_TERMS_PATH = "/terms";

/** There is no Hub privacy page; do not redirect /privacy. */
export const LEGACY_PRIVACY_PATH = "/privacy";

/** /dpa follows #75; do not add a client-side redirect here. */
export const LEGACY_DPA_PATH = "/dpa";

/**
 * Client-side aliases for existing /legal pages.
 * /privacy has no matching legal page. /dpa is left to #75.
 */
export function getLegacyLegalRedirectTarget(pathname: string): string | null {
  if (pathname === LEGACY_TERMS_PATH) {
    return ACADEMY_TERMS_INDEX_PATH;
  }
  return null;
}
