import { describe, expect, it } from "vitest";
import { ACADEMY_TERMS_INDEX_PATH } from "./academyLegal";
import {
  LEGACY_DPA_PATH,
  LEGACY_PRIVACY_PATH,
  LEGACY_TERMS_PATH,
  getLegacyLegalRedirectTarget,
} from "./legalRedirects";

describe("legacy legal redirects", () => {
  it("sends /terms to the existing /legal/terms index", () => {
    expect(LEGACY_TERMS_PATH).toBe("/terms");
    expect(getLegacyLegalRedirectTarget(LEGACY_TERMS_PATH)).toBe(ACADEMY_TERMS_INDEX_PATH);
    expect(getLegacyLegalRedirectTarget("/terms")).toBe("/legal/terms");
  });

  it("sends /privacy to the Cloud Privacy Notice", () => {
    expect(LEGACY_PRIVACY_PATH).toBe("/privacy");
    expect(getLegacyLegalRedirectTarget(LEGACY_PRIVACY_PATH)).toBe("/legal/privacy");
  });

  it("does not invent a DPA destination", () => {
    expect(getLegacyLegalRedirectTarget(LEGACY_DPA_PATH)).toBeNull();
    expect(getLegacyLegalRedirectTarget("/legal/privacy")).toBeNull();
  });
});
