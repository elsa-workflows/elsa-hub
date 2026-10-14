import { afterEach, describe, expect, it } from "vitest";
import {
  AUTH_CALLBACK_PATH,
  AUTH_REDIRECT_STORAGE_KEY,
  consumeAuthRedirect,
  getAuthCallbackUrl,
  rememberAuthRedirect,
} from "./authRedirect";

describe("getAuthCallbackUrl", () => {
  it("appends /auth/callback to the current origin", () => {
    expect(getAuthCallbackUrl("https://www.elsaworkflows.io")).toBe(
      "https://www.elsaworkflows.io/auth/callback",
    );
    expect(getAuthCallbackUrl("http://localhost:8080")).toBe(
      "http://localhost:8080/auth/callback",
    );
    expect(AUTH_CALLBACK_PATH).toBe("/auth/callback");
  });
});

describe("authRedirect session storage", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("stores a non-root path and returns it once", () => {
    rememberAuthRedirect("/dashboard/settings");
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe("/dashboard/settings");
    expect(consumeAuthRedirect()).toBe("/dashboard/settings");
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
  });

  it("ignores the site root so callers fall back to /dashboard", () => {
    rememberAuthRedirect("/");
    expect(consumeAuthRedirect()).toBe("/dashboard");
  });
});
