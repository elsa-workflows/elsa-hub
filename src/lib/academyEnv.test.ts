import { describe, expect, it } from "vitest";
import { academyStubEnabledFromEnv } from "./academyEnv";

describe("academyStubEnabledFromEnv", () => {
  it("is on in DEV", () => {
    expect(academyStubEnabledFromEnv({ DEV: true })).toBe(true);
  });

  it("is on when VITE_ACADEMY_STUB=1 even outside DEV", () => {
    expect(academyStubEnabledFromEnv({ DEV: false, VITE_ACADEMY_STUB: "1" })).toBe(true);
  });

  it("is off in a production-like env", () => {
    expect(academyStubEnabledFromEnv({ DEV: false })).toBe(false);
    expect(academyStubEnabledFromEnv({ DEV: false, VITE_ACADEMY_STUB: "0" })).toBe(false);
    expect(academyStubEnabledFromEnv({})).toBe(false);
  });
});
