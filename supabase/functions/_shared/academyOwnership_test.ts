import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  ACADEMY_ALREADY_OWNED,
  ownsSoloBundle,
  type PublishedAcademyCourse,
} from "./academyOwnership.ts";
import { extractExportAssignment, extractMarkedBlock } from "./parity_test_support.ts";

const readSibling = (path: string) => Deno.readTextFile(new URL(path, import.meta.url));

const RULE = "solo-bundle-ownership-rule";

Deno.test("the Solo Bundle ownership rule stays identical to src/lib/academyOwnership.ts", async () => {
  const src = "../../../src/lib/academyOwnership.ts";
  assertEquals(
    extractMarkedBlock(await readSibling("./academyOwnership.ts"), RULE, "academyOwnership.ts"),
    extractMarkedBlock(await readSibling(src), RULE, src),
  );
});

Deno.test("the already_owned 409 code stays identical to src/lib/academy.ts", async () => {
  assertEquals(ACADEMY_ALREADY_OWNED, "already_owned");
  assertEquals(
    extractExportAssignment(await readSibling("../../../src/lib/academy.ts"), "ACADEMY_ALREADY_OWNED"),
    JSON.stringify(ACADEMY_ALREADY_OWNED),
  );
});

const solo = (id: string): PublishedAcademyCourse => ({ id, product_codes: ["solo_bundle"] });

Deno.test("owning the Solo Bundle needs a personal grant covering every published course", () => {
  const published = [solo("a"), solo("b")];
  assertEquals(ownsSoloBundle([{ course_id: null, product_code: "solo_bundle" }], published), true);
  assertEquals(
    ownsSoloBundle(
      [{ course_id: "a", product_code: null }, { course_id: "b", product_code: null }],
      published,
    ),
    true,
  );
  assertEquals(ownsSoloBundle([{ course_id: "a", product_code: null }], published), false);
  assertEquals(ownsSoloBundle([{ course_id: null, product_code: "team_5" }], published), false);
  assertEquals(ownsSoloBundle([], published), false);
  assertEquals(ownsSoloBundle([{ course_id: null, product_code: "solo_bundle" }], []), false);
});
