import { describe, expect, it } from "vitest";
import { ownsSoloBundle, soloBundleOwnership } from "./academyOwnership";

const courses = [
  { id: "a", product_codes: ["solo_bundle"] },
  { id: "b", product_codes: ["solo_bundle"] },
];
const bundleGrant = { course_id: null, product_code: "solo_bundle" };
const courseGrant = (id: string) => ({ course_id: id, product_code: null });
const loaded = { isLoading: false, isError: false, courses, grants: [] };

describe("soloBundleOwnership", () => {
  it.each([
    ["loading", { isLoading: true }],
    ["errored", { isError: true }],
    ["loading and owned", { isLoading: true, grants: [bundleGrant] }],
    ["errored and owned", { isError: true, grants: [bundleGrant] }],
  ])("is unknown while %s", (_label, state) => {
    expect(soloBundleOwnership({ ...loaded, ...state })).toBe("unknown");
  });

  it("is none when there are no published courses", () => {
    expect(soloBundleOwnership({ ...loaded, courses: [], grants: [bundleGrant] })).toBe("none");
  });

  it("is none without personal grants, whatever access a team seat or admin lends", () => {
    expect(soloBundleOwnership(loaded)).toBe("none");
  });

  it("is none when personal grants cover only some published courses", () => {
    expect(soloBundleOwnership({ ...loaded, grants: [courseGrant("a")] })).toBe("none");
  });

  it("is none for a bundle grant whose SKU the courses don't list", () => {
    expect(
      soloBundleOwnership({ ...loaded, grants: [{ course_id: null, product_code: "team_5" }] }),
    ).toBe("none");
  });

  it.each([
    ["a solo_bundle grant", [bundleGrant]],
    ["a course grant for every published course", [courseGrant("a"), courseGrant("b")]],
  ])("is owned with %s", (_label, grants) => {
    expect(soloBundleOwnership({ ...loaded, grants })).toBe("owned");
  });
});

describe("ownsSoloBundle", () => {
  it("treats a course without product_codes as covered only by a course grant", () => {
    const bare = [{ id: "a", product_codes: null }];
    expect(ownsSoloBundle([bundleGrant], bare)).toBe(false);
    expect(ownsSoloBundle([courseGrant("a")], bare)).toBe(true);
  });
});
