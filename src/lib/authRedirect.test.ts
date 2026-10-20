import { afterEach, describe, expect, it } from "vitest";
import {
  AUTH_CALLBACK_PATH,
  AUTH_CONFIRM_PATH,
  AUTH_REDIRECT_STORAGE_KEY,
  consumeAuthRedirect,
  getAuthCallbackUrl,
  getAuthConfirmUrl,
  rememberAuthRedirect,
  sanitizeAuthRedirect,
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

describe("getAuthConfirmUrl", () => {
  it("appends /auth/confirm to the current origin", () => {
    expect(getAuthConfirmUrl("https://www.elsaworkflows.io")).toBe(
      "https://www.elsaworkflows.io/auth/confirm",
    );
    expect(getAuthConfirmUrl("http://localhost:8080")).toBe(
      "http://localhost:8080/auth/confirm",
    );
    expect(AUTH_CONFIRM_PATH).toBe("/auth/confirm");
  });
});

describe("sanitizeAuthRedirect", () => {
  it.each([
    ["//evil.com"],
    ["/\\evil.com"],
    ["https://evil.com"],
    ["%2F%2Fevil.com"],
    ["javascript:alert(1)"],
  ])("rejects %s", (payload) => {
    expect(sanitizeAuthRedirect(payload)).toBeNull();
  });

  it("allows a same-site path with a query string", () => {
    expect(sanitizeAuthRedirect("/courses?x=1")).toBe("/courses?x=1");
  });

  it("returns the original value so encoded query strings survive", () => {
    const original = "/search?q=%2Fcourses%3Fx%3D1";
    expect(sanitizeAuthRedirect(original)).toBe(original);
    expect(sanitizeAuthRedirect(original)).not.toBe("/search?q=/courses?x=1");
  });

  it("rejects a path when decodeURIComponent throws", () => {
    expect(sanitizeAuthRedirect("/%ZZ")).toBeNull();
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

  it.each([
    ["//evil.com"],
    ["/\\evil.com"],
    ["https://evil.com"],
    ["%2F%2Fevil.com"],
    ["javascript:alert(1)"],
  ])("does not store %s", (payload) => {
    rememberAuthRedirect(payload);
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["//evil.com"],
    ["/\\evil.com"],
    ["https://evil.com"],
    ["%2F%2Fevil.com"],
    ["javascript:alert(1)"],
  ])("does not return planted %s on read", (payload) => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, payload);
    expect(consumeAuthRedirect()).toBe("/dashboard");
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
  });

  it("stores and returns a valid path with a query string", () => {
    rememberAuthRedirect("/courses?x=1");
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe("/courses?x=1");
    expect(consumeAuthRedirect()).toBe("/courses?x=1");
  });
});
