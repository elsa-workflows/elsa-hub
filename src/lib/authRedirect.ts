export const AUTH_CALLBACK_PATH = "/auth/callback";
export const AUTH_REDIRECT_STORAGE_KEY = "authRedirect";
export const DEFAULT_POST_AUTH_PATH = "/dashboard";

export function getAuthCallbackUrl(origin: string = window.location.origin): string {
  return `${origin}${AUTH_CALLBACK_PATH}`;
}

export function rememberAuthRedirect(redirectTo?: string | null): void {
  if (!redirectTo || redirectTo === "/") {
    return;
  }
  sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, redirectTo);
}

export function consumeAuthRedirect(fallback: string = DEFAULT_POST_AUTH_PATH): string {
  const stored = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return stored || fallback;
}
