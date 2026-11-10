import { ACADEMY_TERMS_INDEX_PATH } from "./academyLegal";
import { CLOUD_PRIVACY_PATH } from "./cloudPrivacy";

/** Short /terms URL used by older Cloud and external links. */
export const LEGACY_TERMS_PATH = "/terms";

/** Short /privacy URL; the notice lives at /legal/privacy after #177. */
export const LEGACY_PRIVACY_PATH = "/privacy";

/** /dpa follows #75; do not add a client-side redirect here. */
export const LEGACY_DPA_PATH = "/dpa";

/**
 * Client-side aliases for existing /legal pages.
 * /dpa is left to #75.
 */
export function getLegacyLegalRedirectTarget(pathname: string): string | null {
  if (pathname === LEGACY_TERMS_PATH) {
    return ACADEMY_TERMS_INDEX_PATH;
  }
  if (pathname === LEGACY_PRIVACY_PATH) {
    return CLOUD_PRIVACY_PATH;
  }
  return null;
}
