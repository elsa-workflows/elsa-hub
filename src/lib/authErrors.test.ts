import { describe, expect, it } from "vitest";
import { describeAuthError, parseAuthCallbackError } from "./authErrors";

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
});
