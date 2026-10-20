import { describe, expect, it } from "vitest";
import { soloBundleOwnership } from "./academyOwnership";

const courses = [{ id: "a" }, { id: "b" }];
const loaded = { isLoading: false, isError: false, courses, hasAccess: {} };

describe("soloBundleOwnership", () => {
  it.each([
    ["loading", { isLoading: true }],
    ["errored", { isError: true }],
    ["loading and full access", { isLoading: true, hasAccess: { a: true, b: true } }],
    ["errored and full access", { isError: true, hasAccess: { a: true, b: true } }],
  ])("is unknown while %s", (_label, state) => {
    expect(soloBundleOwnership({ ...loaded, ...state })).toBe("unknown");
  });

  it("is none when there are no published courses", () => {
    expect(soloBundleOwnership({ ...loaded, courses: [] })).toBe("none");
  });

  it("is none on partial access", () => {
    expect(soloBundleOwnership({ ...loaded, hasAccess: { a: true, b: false } })).toBe("none");
    expect(soloBundleOwnership({ ...loaded, hasAccess: { a: true } })).toBe("none");
  });

  it("is owned on access to every published course", () => {
    expect(soloBundleOwnership({ ...loaded, hasAccess: { a: true, b: true } })).toBe("owned");
  });
});
