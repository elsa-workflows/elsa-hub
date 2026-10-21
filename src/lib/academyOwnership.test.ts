import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractExportAssignment,
  extractMarkedBlock,
} from "../../supabase/functions/_shared/parity_test_support";
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
    ["loading and owned", { isLoading: true, grants: [bundleGrant] }],
  ])("is unknown while %s", (_label, state) => {
    expect(soloBundleOwnership({ ...loaded, ...state })).toBe("unknown");
  });

  it.each([
    ["errored", { isError: true }],
    ["errored and owned", { isError: true, grants: [bundleGrant] }],
    ["errored while something else loads", { isError: true, isLoading: true }],
  ])("is failed when %s", (_label, state) => {
    expect(soloBundleOwnership({ ...loaded, ...state })).toBe("failed");
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

// The vitest twin of supabase/functions/_shared/academyOwnership_test.ts, so drift fails CI here too.
describe("the Edge Function copy in supabase/functions/_shared/academyOwnership.ts", () => {
  const SRC_OWNERSHIP = "src/lib/academyOwnership.ts";
  const SRC_ACADEMY = "src/lib/academy.ts";
  const SHARED_OWNERSHIP = "supabase/functions/_shared/academyOwnership.ts";
  const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

  it("keeps the marked ownsSoloBundle rule identical", () => {
    const rule = "solo-bundle-ownership-rule";
    expect(extractMarkedBlock(read(SRC_OWNERSHIP), rule, SRC_OWNERSHIP)).toBe(
      extractMarkedBlock(read(SHARED_OWNERSHIP), rule, SHARED_OWNERSHIP),
    );
  });

  it("keeps ACADEMY_ALREADY_OWNED identical", () => {
    const name = "ACADEMY_ALREADY_OWNED";
    expect(extractExportAssignment(read(SRC_ACADEMY), name)).toBe(
      extractExportAssignment(read(SHARED_OWNERSHIP), name),
    );
  });
});
