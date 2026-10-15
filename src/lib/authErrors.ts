type AuthLikeError = {
  message?: string;
  name?: string;
  code?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
} | null | undefined;

function decodeParam(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function collectText(error: AuthLikeError): { code: string; message: string } {
  const code = (
    error?.code ||
    error?.error_code ||
    error?.error ||
    error?.name ||
    ""
  ).toLowerCase();
  const message = (
    error?.message ||
    error?.error_description ||
    ""
  ).toLowerCase();
  return { code, message };
}

const GENERIC_AUTH_ERROR = "Something went wrong while signing in. Please try again.";

export const SAME_BROWSER_AUTH_MESSAGE =
  "Open the link in the same browser where you requested it.";

export const OTP_EXPIRED_AUTH_MESSAGE = "This link has expired, request a new one.";

/**
 * Map Supabase Auth / OAuth callback errors to a short message users can act on.
 * Supabase auto-links identities by matching email and strips unconfirmed
 * identities. See docs/auth-identity-linking.md.
 */
export function describeAuthError(error: AuthLikeError, fallback?: string): string {
  const { code, message } = collectText(error);
  const blob = `${code} ${message}`;

  if (blob.includes("access_denied") || blob.includes("user denied")) {
    return "Sign-in was cancelled. You can try again when you are ready.";
  }

  if (
    blob.includes("over_email_send_rate_limit") ||
    blob.includes("rate limit") ||
    blob.includes("for security purposes") ||
    blob.includes("too many requests")
  ) {
    return "Too many sign-in emails were sent. Wait a minute and try again.";
  }

  if (
    blob.includes("identity_already_exists") ||
    (blob.includes("identity") && blob.includes("already") && blob.includes("link"))
  ) {
    return "This Google or GitHub account is already linked to a different Elsa Hub user. Sign in with the method you used before, or connect it from Settings → Connected accounts after you sign in.";
  }

  if (
    blob.includes("email_exists") ||
    blob.includes("already registered") ||
    blob.includes("already been registered") ||
    blob.includes("user already exists")
  ) {
    return "An account with this email already exists. Sign in with the method you used before (GitHub, Google, or email). Matching emails are linked automatically to one profile; unconfirmed identities are removed.";
  }

  if (
    blob.includes("code verifier") ||
    blob.includes("code_verifier") ||
    blob.includes("pkce_code_verifier") ||
    blob.includes("authpkcecodeverifier") ||
    blob.includes("bad_code_verifier")
  ) {
    return SAME_BROWSER_AUTH_MESSAGE;
  }

  if (
    blob.includes("otp_expired") ||
    blob.includes("flow_state_expired") ||
    blob.includes("flow_state_not_found") ||
    blob.includes("bad_jwt") ||
    blob.includes("token has expired") ||
    blob.includes("already used")
  ) {
    return OTP_EXPIRED_AUTH_MESSAGE;
  }

  if (blob.includes("email_not_confirmed") || blob.includes("not confirmed")) {
    return "This email is not verified yet. Open the confirmation link we sent, then try again. Unverified emails cannot be linked to GitHub or Google.";
  }

  if (blob.includes("invalid login credentials") || blob.includes("invalid_credentials")) {
    return "Email or password is incorrect.";
  }

  if (blob.includes("validation") || blob.includes("invalid email") || blob.includes("unable to validate")) {
    return "Enter a valid email address and try again.";
  }

  if (blob.includes("signup_disabled")) {
    return "New accounts are not being accepted right now. If you already have an account, sign in with GitHub, Google, or email.";
  }

  const original = (error?.message || error?.error_description || "").trim();
  if (original) {
    console.warn("Unmapped auth error:", original);
  }

  const safeFallback = fallback?.trim();
  if (safeFallback && safeFallback !== original) {
    return safeFallback;
  }

  return GENERIC_AUTH_ERROR;
}

export function parseAuthCallbackError(
  search: string,
  hash: string = "",
): { code?: string; message: string } | null {
  const fromSearch = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fromHash = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

  const error =
    fromSearch.get("error") ||
    fromHash.get("error") ||
    fromSearch.get("error_code") ||
    fromHash.get("error_code");
  if (!error) {
    return null;
  }

  const description =
    decodeParam(fromSearch.get("error_description") || fromHash.get("error_description")) ||
    decodeParam(fromSearch.get("error_code") || fromHash.get("error_code")) ||
    error;

  return {
    code: fromSearch.get("error_code") || fromHash.get("error_code") || error,
    message: describeAuthError({
      error,
      error_code: fromSearch.get("error_code") || fromHash.get("error_code") || undefined,
      error_description: description,
      message: description,
    }),
  };
}
