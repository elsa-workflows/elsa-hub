export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_REDIRECT_STORAGE_KEY = "authRedirect";
export const DEFAULT_POST_AUTH_PATH = "/dashboard";

const SCHEME_AFTER_DECODE = /^[a-zA-Z][a-zA-Z+\-.]*:/;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * Decode a redirect value until it stops changing, so encoded open-redirect
 * payloads such as %2F%2Fevil.com are judged in their final form.
 */
export function decodeUntilStable(value: string): string {
  let current = value;
  for (let i = 0; i < 8; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return current;
    }
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
}

/**
 * Allow only same-site paths: a single leading "/", no "//", no "/\", and no
 * scheme after repeated URL-decoding. Returns the stable decoded path, or null.
 */
export function sanitizeAuthRedirect(redirectTo?: string | null): string | null {
  if (redirectTo == null || redirectTo === "") {
    return null;
  }

  const decoded = decodeUntilStable(redirectTo);

  if (SCHEME_AFTER_DECODE.test(decoded)) {
    return null;
  }
  if (!decoded.startsWith("/")) {
    return null;
  }
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return null;
  }
  if (decoded.includes("//") || decoded.includes("/\\")) {
    return null;
  }
  if (CONTROL_CHARS.test(decoded)) {
    return null;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      const url = new URL(decoded, window.location.origin);
      if (url.origin !== window.location.origin) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return decoded;
}

export function getAuthCallbackUrl(origin: string = window.location.origin): string {
  return `${origin}${AUTH_CALLBACK_PATH}`;
}

export function rememberAuthRedirect(redirectTo?: string | null): void {
  const safe = sanitizeAuthRedirect(redirectTo);
  if (!safe || safe === "/") {
    return;
  }
  sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, safe);
}

export function consumeAuthRedirect(fallback: string = DEFAULT_POST_AUTH_PATH): string {
  const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return sanitizeAuthRedirect(stored) ?? sanitizeAuthRedirect(fallback) ?? DEFAULT_POST_AUTH_PATH;
}
