import { describe, expect, it } from "vitest";
import { academyStubEnabledFromEnv } from "./academyEnv";

describe("academyStubEnabledFromEnv", () => {
  it("is on in DEV", () => {
    expect(academyStubEnabledFromEnv({ DEV: true })).toBe(true);
  });

  it("is on when VITE_ACADEMY_STUB=1 outside a production build", () => {
    expect(academyStubEnabledFromEnv({ DEV: false, PROD: false, VITE_ACADEMY_STUB: "1" })).toBe(true);
  });

  it("is off in a production build even if VITE_ACADEMY_STUB=1", () => {
    expect(academyStubEnabledFromEnv({ DEV: false, PROD: true, VITE_ACADEMY_STUB: "1" })).toBe(false);
  });

  it("is off in a production-like env", () => {
    expect(academyStubEnabledFromEnv({ DEV: false, PROD: true })).toBe(false);
    expect(academyStubEnabledFromEnv({ DEV: false, VITE_ACADEMY_STUB: "0" })).toBe(false);
    expect(academyStubEnabledFromEnv({})).toBe(false);
  });
});
