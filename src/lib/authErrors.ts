type AuthLikeHeaders = {
  get?: (name: string) => string | null | undefined;
  [key: string]: unknown;
};

type AuthLikeError = {
  message?: string;
  name?: string;
  code?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
  status?: number;
  retryAfter?: number | string;
  retry_after?: number | string;
  headers?: AuthLikeHeaders;
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

export const EMAIL_SEND_RATE_LIMIT_MESSAGE =
  "We just sent you an email. Wait a minute before requesting another one.";

export const EMAIL_HOURLY_RATE_LIMIT_MESSAGE =
  "The hourly email send limit has been reached. Try again later.";

export const AUTH_RATE_LIMIT_MESSAGE =
  "Too many attempts, wait a moment and try again.";

export const EMAIL_SEND_RATE_LIMIT_DEFAULT_MS = 60_000;

const AFTER_N_SECONDS = /after\s+\d+\s+seconds?/i;

/**
 * Per-address cooldown from signInWithOtp, signUp, and resend.
 * GoTrue uses `over_email_send_rate_limit` for both this cooldown
 * (`...after N seconds`) and the project-wide hourly cap
 * (`email rate limit exceeded`), so the message is classified first.
 */
export function isEmailSendRateLimit(error: AuthLikeError): boolean {
  if (error == null) return false;
  const { message } = collectText(error);
  if (AFTER_N_SECONDS.test(message)) return true;
  if (message.includes("email rate limit exceeded")) return false;
  return message.includes("for security purposes");
}

function isEmailHourlyRateLimit(error: AuthLikeError): boolean {
  if (error == null) return false;
  const { message } = collectText(error);
  if (AFTER_N_SECONDS.test(message)) return false;
  return message.includes("email rate limit exceeded");
}

function isAuthRateLimit(error: AuthLikeError): boolean {
  if (error == null || isEmailSendRateLimit(error) || isEmailHourlyRateLimit(error)) {
    return false;
  }
  if (error.status === 429) return true;
  const { code, message } = collectText(error);
  const blob = `${code} ${message}`;
  return (
    blob.includes("over_request_rate_limit") ||
    blob.includes("too many requests") ||
    blob.includes("rate limit")
  );
}

function headerValue(headers: AuthLikeHeaders | undefined, name: string): string | null {
  if (!headers) return null;
  if (typeof headers.get === "function") {
    const fromGet = headers.get(name) ?? headers.get(name.toLowerCase());
    if (fromGet) return String(fromGet);
  }
  const direct = headers[name] ?? headers[name.toLowerCase()] ?? headers["Retry-After"];
  return direct == null || typeof direct === "function" ? null : String(direct);
}

function retryAfterHeaderToMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return Math.ceil(seconds) * 1000;
  }
  const when = Date.parse(trimmed);
  if (Number.isNaN(when)) return null;
  return Math.max(0, when - Date.now());
}

/**
 * Remaining wait before another sign-in email is allowed, in milliseconds.
 * Reads Retry-After (header, retryAfter, retry_after) or "after N seconds"
 * from the GoTrue message. Returns null when the error does not say.
 */
export function parseEmailSendRetryAfterMs(error: AuthLikeError): number | null {
  if (error == null) return null;

  const fromField = error.retryAfter ?? error.retry_after;
  if (fromField != null && String(fromField).trim() !== "") {
    const fromHeader = retryAfterHeaderToMs(String(fromField));
    if (fromHeader != null) return fromHeader;
  }

  const header = headerValue(error.headers, "Retry-After");
  if (header) {
    const fromHeader = retryAfterHeaderToMs(header);
    if (fromHeader != null) return fromHeader;
  }

  const text = `${error.message || ""} ${error.error_description || ""}`;
  const match = text.match(/after\s+(\d+)\s+seconds?/i);
  if (match) {
    return Number(match[1]) * 1000;
  }
  return null;
}

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

  if (isEmailSendRateLimit(error)) {
    return EMAIL_SEND_RATE_LIMIT_MESSAGE;
  }

  if (isEmailHourlyRateLimit(error)) {
    return EMAIL_HOURLY_RATE_LIMIT_MESSAGE;
  }

  if (isAuthRateLimit(error)) {
    return AUTH_RATE_LIMIT_MESSAGE;
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
