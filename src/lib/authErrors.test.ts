import { describe, expect, it, vi } from "vitest";
import {
  describeAuthError,
  parseAuthCallbackError,
  SAME_BROWSER_AUTH_MESSAGE,
} from "./authErrors";

describe("describeAuthError", () => {
  it("explains magic-link rate limits", () => {
    expect(
      describeAuthError({
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 60 seconds.",
      }),
    ).toMatch(/wait a minute/i);
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
    expect(describeAuthError({ message: "Token has expired or is invalid" })).toMatch(
      /expired or was already used/i,
    );
    expect(describeAuthError({ code: "otp_expired" })).toMatch(/expired or was already used/i);
    expect(describeAuthError({ code: "bad_jwt" })).toMatch(/expired or was already used/i);
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
    expect(describeAuthError({ code: "flow_state_not_found" })).toBe(SAME_BROWSER_AUTH_MESSAGE);
    expect(describeAuthError({ code: "flow_state_expired" })).toBe(SAME_BROWSER_AUTH_MESSAGE);
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

  it("maps PKCE and flow-state callback errors to the same-browser hint", () => {
    const parsed = parseAuthCallbackError(
      "?error=server_error&error_code=flow_state_not_found&error_description=Flow+state+not+found",
      "",
    );
    expect(parsed?.code).toBe("flow_state_not_found");
    expect(parsed?.message).toBe(SAME_BROWSER_AUTH_MESSAGE);
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
