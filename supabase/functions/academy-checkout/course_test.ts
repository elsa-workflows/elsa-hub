import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { loadAcademyCourse, type AcademyCourseRow } from "./course.ts";

const PUBLISHED: AcademyCourseRow = {
  id: "00000000-0000-4000-8000-000000002001",
  slug: "published-course",
  title: "Published Course",
  product_code: "solo_bundle",
  stripe_price_id: "price_solo_test",
  price_cents: 2900,
  currency: "eur",
  is_published: true,
};

const DRAFT_CATALOG: AcademyCourseRow = {
  id: "00000000-0000-4000-8000-000000002099",
  slug: "draft-course",
  title: "Draft Course",
  product_code: "solo_bundle",
  stripe_price_id: "price_draft",
  price_cents: 100,
  currency: "eur",
  is_published: false,
};

const TEAM5: AcademyCourseRow = {
  id: "00000000-0000-4000-8000-000000002005",
  slug: "team-5",
  title: "Team 5",
  product_code: "team_5",
  stripe_price_id: "price_team5_test",
  price_cents: 9900,
  currency: "eur",
  is_published: false,
};

function createCourseClient(rows: AcademyCourseRow[]) {
  return {
    from: (table: string) => {
      assertEquals(table, "academy_courses");
      const filters: Array<[string, unknown]> = [];
      const api = {
        select: () => api,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return api;
        },
        limit: async (_n: number) => ({
          data: rows.filter((row) =>
            filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value)
          ),
          error: null,
        }),
        maybeSingle: async () => {
          const match = rows.filter((row) =>
            filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value)
          );
          if (match.length > 1) {
            return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
          }
          return { data: match[0] ?? null, error: null };
        },
      };
      return api;
    },
  };
}

Deno.test("Solo published slug returns that course price", async () => {
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, DRAFT_CATALOG, TEAM5]), {
    courseSlug: "published-course",
  });
  assertEquals(loaded.course?.id, PUBLISHED.id);
  assertEquals(loaded.course?.stripe_price_id, "price_solo_test");
});

Deno.test("Solo unpublished catalog slug is not sold", async () => {
  const loaded = await loadAcademyCourse(createCourseClient([DRAFT_CATALOG]), {
    courseSlug: "draft-course",
  });
  assertEquals(loaded.error?.status, 404);
});

Deno.test("Solo unpublished catalog id is not sold", async () => {
  const loaded = await loadAcademyCourse(createCourseClient([DRAFT_CATALOG]), {
    courseId: DRAFT_CATALOG.id,
  });
  assertEquals(loaded.error?.status, 404);
});

Deno.test("Solo product_code without a slug is rejected", async () => {
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, DRAFT_CATALOG]), {
    productCode: "solo_bundle",
  });
  assertEquals(loaded.error?.status, 400);
});

Deno.test("Team SKU looks up unpublished slug team-5 exactly once", async () => {
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, TEAM5]), {
    productCode: "team_5",
  });
  assertEquals(loaded.course?.slug, "team-5");
  assertEquals(loaded.course?.is_published, false);
  assertEquals(loaded.course?.stripe_price_id, "price_team5_test");
});

Deno.test("Team SKU with zero matching slug rows is a hard error", async () => {
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED]), {
    productCode: "team_5",
  });
  assertEquals(loaded.error?.status, 404);
});

Deno.test("Team SKU with more than one matching slug row is a hard error", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([
      TEAM5,
      { ...TEAM5, id: "00000000-0000-4000-8000-000000002006" },
    ]),
    { productCode: "team_5" },
  );
  assertEquals(loaded.error?.status, 409);
});

Deno.test("Team SKU row whose product_code does not match the requested SKU fails closed", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([
      {
        ...TEAM5,
        product_code: "solo_bundle",
      },
    ]),
    { productCode: "team_5" },
  );
  assertEquals(loaded.error?.status, 409);
  assertEquals(loaded.course, undefined);
});

Deno.test("Team SKU row for team_10 at the team-5 slug fails closed", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([
      {
        ...TEAM5,
        product_code: "team_10",
      },
    ]),
    { productCode: "team_5" },
  );
  assertEquals(loaded.error?.status, 409);
});

Deno.test("published Solo courses that share one stripe_price_id use that price", async () => {
  const other: AcademyCourseRow = {
    ...PUBLISHED,
    id: "00000000-0000-4000-8000-000000002002",
    slug: "other-published",
    title: "Other Published",
  };
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, other, DRAFT_CATALOG]), {
    courseSlug: "other-published",
  });
  assertEquals(loaded.course?.id, other.id);
  assertEquals(loaded.course?.stripe_price_id, "price_solo_test");
});

Deno.test("published Solo courses with differing stripe_price_id fail closed", async () => {
  const other: AcademyCourseRow = {
    ...PUBLISHED,
    id: "00000000-0000-4000-8000-000000002002",
    slug: "other-published",
    title: "Other Published",
    stripe_price_id: "price_other_solo",
  };
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, other]), {
    courseSlug: "published-course",
  });
  assertEquals(loaded.error?.status, 409);
  assertEquals(loaded.course, undefined);
});

Deno.test("a published Solo course with a null price next to a priced course fails closed", async () => {
  const other: AcademyCourseRow = {
    ...PUBLISHED,
    id: "00000000-0000-4000-8000-000000002002",
    slug: "other-published",
    stripe_price_id: null,
  };
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, other]), {
    courseId: PUBLISHED.id,
  });
  assertEquals(loaded.error?.status, 409);
});

Deno.test("a published catalog row that is not solo_bundle is not sold as Solo", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([
      {
        ...PUBLISHED,
        product_code: "team_5",
      },
    ]),
    { courseSlug: "published-course" },
  );
  assertEquals(loaded.error?.status, 409);
});
