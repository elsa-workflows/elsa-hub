import { describe, expect, it, vi } from "vitest";
import {
  AUTH_RATE_LIMIT_MESSAGE,
  describeAuthError,
  EMAIL_HOURLY_RATE_LIMIT_MESSAGE,
  EMAIL_SEND_RATE_LIMIT_MESSAGE,
  isEmailSendRateLimit,
  OTP_EXPIRED_AUTH_MESSAGE,
  parseAuthCallbackError,
  parseEmailSendRetryAfterMs,
  SAME_BROWSER_AUTH_MESSAGE,
} from "./authErrors";

describe("describeAuthError", () => {
  it("uses the email-send wording for the per-address cooldown message", () => {
    expect(
      describeAuthError({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 60 seconds.",
      }),
    ).toBe(EMAIL_SEND_RATE_LIMIT_MESSAGE);
    expect(
      isEmailSendRateLimit({
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 14 seconds.",
      }),
    ).toBe(true);
    expect(isEmailSendRateLimit({ code: "over_email_send_rate_limit" })).toBe(false);
    expect(isEmailSendRateLimit({ status: 429 })).toBe(false);
    expect(isEmailSendRateLimit({ message: "invalid login credentials" })).toBe(false);
  });

  it("uses hourly wording when GoTrue reuses over_email_send_rate_limit for the cap", () => {
    expect(
      describeAuthError({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "Email rate limit exceeded",
      }),
    ).toBe(EMAIL_HOURLY_RATE_LIMIT_MESSAGE);
    expect(
      isEmailSendRateLimit({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "Email rate limit exceeded",
      }),
    ).toBe(false);
    expect(EMAIL_HOURLY_RATE_LIMIT_MESSAGE).not.toMatch(/this address/i);
    expect(EMAIL_HOURLY_RATE_LIMIT_MESSAGE).not.toBe(EMAIL_SEND_RATE_LIMIT_MESSAGE);
  });

  it("keeps verifyOtp and OAuth 429s on their own wording", () => {
    expect(
      describeAuthError({
        status: 429,
        code: "over_request_rate_limit",
        message: "Too many requests",
      }),
    ).toBe(AUTH_RATE_LIMIT_MESSAGE);
    expect(
      describeAuthError({
        status: 429,
        message: "Too many requests",
      }),
    ).toBe(AUTH_RATE_LIMIT_MESSAGE);
    expect(describeAuthError({ status: 429 })).toBe(AUTH_RATE_LIMIT_MESSAGE);
    expect(describeAuthError({ status: 429 })).not.toBe(EMAIL_SEND_RATE_LIMIT_MESSAGE);
  });

  it("uses the neutral attempts wording for a bare email-send code without a status", () => {
    // Callback URLs carry error_code and error_description but no HTTP status.
    expect(
      describeAuthError({
        error_code: "over_email_send_rate_limit",
        error_description: "Something GoTrue has not said before",
      }),
    ).toBe(AUTH_RATE_LIMIT_MESSAGE);
    expect(describeAuthError({ code: "over_email_send_rate_limit" })).toBe(AUTH_RATE_LIMIT_MESSAGE);
  });

  it("reads retry-after seconds from the GoTrue message, headers, or retryAfter", () => {
    expect(
      parseEmailSendRetryAfterMs({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 33 seconds.",
      }),
    ).toBe(33_000);
    expect(
      parseEmailSendRetryAfterMs({
        message: "For security purposes, you can only request this after 14 seconds.",
      }),
    ).toBe(14_000);
    expect(
      parseEmailSendRetryAfterMs({
        status: 429,
        headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? "8" : null) },
      }),
    ).toBe(8_000);
    expect(parseEmailSendRetryAfterMs({ retryAfter: 12 })).toBe(12_000);
    expect(parseEmailSendRetryAfterMs({ status: 429, message: "rate limit exceeded" })).toBeNull();
  });

  it("explains identity-already-linked conflicts", () => {
    expect(
      describeAuthError({
        code: "identity_already_exists",
        message: "Identity is already linked to another user",
      }),
    ).toMatch(/already linked to a different Elsa Hub user/i);
  });

  it("explains unverified / already-registered emails", () => {
    expect(
      describeAuthError({
        message: "A user with this email address has already been registered",
      }),
    ).toMatch(/method you used before/i);
    expect(describeAuthError({ message: "Email not confirmed" })).toMatch(/not verified/i);
  });

  it("explains expired magic links", () => {
    expect(describeAuthError({ message: "Token has expired or is invalid" })).toBe(
      OTP_EXPIRED_AUTH_MESSAGE,
    );
    expect(describeAuthError({ code: "otp_expired" })).toBe(OTP_EXPIRED_AUTH_MESSAGE);
    expect(describeAuthError({ code: "bad_jwt" })).toBe(OTP_EXPIRED_AUTH_MESSAGE);
    expect(describeAuthError({ code: "flow_state_expired" })).toBe(OTP_EXPIRED_AUTH_MESSAGE);
    expect(describeAuthError({ code: "flow_state_not_found" })).toBe(OTP_EXPIRED_AUTH_MESSAGE);
  });

  it("tells the user to reopen a PKCE link in the same browser", () => {
    expect(
      describeAuthError({
        name: "AuthPKCECodeVerifierMissingError",
        code: "pkce_code_verifier_not_found",
        message:
          "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.",
      }),
    ).toBe(SAME_BROWSER_AUTH_MESSAGE);
    expect(describeAuthError({ message: "both auth code and code verifier should be non-empty" })).toBe(
      SAME_BROWSER_AUTH_MESSAGE,
    );
    expect(describeAuthError({ code: "bad_code_verifier" })).toBe(SAME_BROWSER_AUTH_MESSAGE);
  });

  it("does not treat every invalid-link message as an expired OTP", () => {
    expect(describeAuthError({ message: "invalid redirect link" })).not.toMatch(/expired/i);
    expect(describeAuthError({ message: "invalid redirect link" })).toMatch(
      /something went wrong while signing in/i,
    );
  });

  it("returns a generic mapped message instead of raw GoTrue text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(describeAuthError({ message: "weird internal gotrue detail" })).toMatch(
      /something went wrong while signing in/i,
    );
    expect(describeAuthError({ message: "weird internal gotrue detail" })).not.toMatch(
      /gotrue/i,
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("parseAuthCallbackError", () => {
  it("reads PKCE query errors", () => {
    const parsed = parseAuthCallbackError(
      "?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user",
      "",
    );
    expect(parsed?.code).toBe("identity_already_exists");
    expect(parsed?.message).toMatch(/already linked/i);
  });

  it("reads implicit-flow hash errors", () => {
    const parsed = parseAuthCallbackError(
      "",
      "#error=access_denied&error_description=User+denied+access",
    );
    expect(parsed?.message).toMatch(/cancelled/i);
  });

  it("returns null when the callback succeeded", () => {
    expect(parseAuthCallbackError("?code=abc", "#access_token=tok")).toBeNull();
  });

  it("maps a used or expired PKCE code to the expired-link message", () => {
    const parsed = parseAuthCallbackError(
      "?error=server_error&error_code=flow_state_expired&error_description=Flow+state+has+expired",
      "",
    );
    expect(parsed?.code).toBe("flow_state_expired");
    expect(parsed?.message).toBe(OTP_EXPIRED_AUTH_MESSAGE);
  });

  it("does not echo a crafted URL error_description", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = parseAuthCallbackError(
      "?error=server_error&error_description=Please+reset+your+password+at+evil.com",
      "",
    );
    expect(parsed?.message).not.toMatch(/evil\.com/);
    expect(parsed?.message).not.toMatch(/reset your password/i);
    expect(parsed?.message).toMatch(/something went wrong while signing in/i);
    warn.mockRestore();
  });
});
