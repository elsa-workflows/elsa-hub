export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_CONFIRM_PATH = "/auth/confirm";
export const AUTH_REDIRECT_STORAGE_KEY = "authRedirect";
export const DEFAULT_POST_AUTH_PATH = "/dashboard";
export const PROFILE_SETTINGS_PATH = "/dashboard/settings";

export const PROFILE_ROUTE_TABLE = [
  {
    kind: "page" as const,
    parent: "dashboard" as const,
    path: PROFILE_SETTINGS_PATH,
    childPath: "settings",
  },
  {
    kind: "redirect" as const,
    parent: "dashboard" as const,
    path: "/dashboard/settings/profile",
    childPath: "settings/profile",
    to: PROFILE_SETTINGS_PATH,
  },
  {
    kind: "redirect" as const,
    parent: "root" as const,
    path: "/profile",
    childPath: "/profile",
    to: PROFILE_SETTINGS_PATH,
  },
] as const;

export const LEGACY_PROFILE_PATHS = PROFILE_ROUTE_TABLE.filter(
  (route): route is Extract<(typeof PROFILE_ROUTE_TABLE)[number], { kind: "redirect" }> =>
    route.kind === "redirect",
).map((route) => route.path);

export const DASHBOARD_AVATAR_MENU_LINKS = [
  { name: "Profile Settings", to: PROFILE_SETTINGS_PATH },
] as const;

/** True for /auth/confirm with or without a trailing slash. */
export function isAuthConfirmPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "");
  return normalized === AUTH_CONFIRM_PATH;
}

const SCHEME_AFTER_DECODE = /^[a-zA-Z][a-zA-Z+\-.]*:/;

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Decode a redirect value until it stops changing, so encoded open-redirect
 * payloads such as %2F%2Fevil.com are judged in their final form.
 */
export function decodeUntilStable(value: string): string | null {
  let current = value;
  for (let i = 0; i < 8; i++) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return null;
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
 * scheme after repeated URL-decoding. Validation uses the decoded form.
 * Returns the original value when it is safe, so encoded query strings survive.
 */
export function sanitizeAuthRedirect(redirectTo?: string | null): string | null {
  if (redirectTo == null || redirectTo === "") {
    return null;
  }

  const decoded = decodeUntilStable(redirectTo);
  if (decoded == null) {
    return null;
  }

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
  if (hasControlChars(decoded)) {
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

  return redirectTo;
}

export function getAuthCallbackUrl(origin: string = window.location.origin): string {
  return `${origin}${AUTH_CALLBACK_PATH}`;
}

export function getAuthConfirmUrl(origin: string = window.location.origin): string {
  return `${origin}${AUTH_CONFIRM_PATH}`;
}

export function rememberAuthRedirect(redirectTo?: string | null): void {
  const safe = sanitizeAuthRedirect(redirectTo);
  if (!safe || safe === "/") {
    return;
  }
  sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, safe);
}

export function peekAuthRedirect(): string | null {
  return sanitizeAuthRedirect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY));
}

export function consumeAuthRedirect(fallback: string = DEFAULT_POST_AUTH_PATH): string {
  const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return sanitizeAuthRedirect(stored) ?? sanitizeAuthRedirect(fallback) ?? DEFAULT_POST_AUTH_PATH;
}
