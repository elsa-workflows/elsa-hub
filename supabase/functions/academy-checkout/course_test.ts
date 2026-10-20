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

type RowPredicate = (row: Record<string, unknown>) => boolean;

// Mirrors PostgREST semantics: neq never matches NULL, is(null) only matches NULL.
function createCourseClient(rows: AcademyCourseRow[], options: { failOn?: "is" | "neq" } = {}) {
  return {
    from: (table: string) => {
      assertEquals(table, "academy_courses");
      const predicates: RowPredicate[] = [];
      const ops = new Set<string>();
      const match = () =>
        rows.filter((row) => predicates.every((test) => test(row as Record<string, unknown>)));
      const api = {
        select: () => api,
        eq: (column: string, value: unknown) => {
          predicates.push((row) => row[column] === value);
          return api;
        },
        is: (column: string, value: null) => {
          ops.add("is");
          predicates.push((row) => (row[column] ?? null) === value);
          return api;
        },
        neq: (column: string, value: string) => {
          ops.add("neq");
          predicates.push((row) => row[column] != null && row[column] !== value);
          return api;
        },
        limit: async (n: number) => {
          if (options.failOn && ops.has(options.failOn)) {
            return { data: null, error: { message: "secret db detail", code: "XX000" } };
          }
          return { data: match().slice(0, n), error: null };
        },
        maybeSingle: async () => {
          const found = match();
          if (found.length > 1) {
            return { data: null, error: { code: "PGRST116", message: "multiple rows" } };
          }
          return { data: found[0] ?? null, error: null };
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

const DRIFT_MESSAGE = "Published Solo courses have conflicting Stripe prices";

const OTHER_PUBLISHED: AcademyCourseRow = {
  ...PUBLISHED,
  id: "00000000-0000-4000-8000-000000002002",
  slug: "other-published",
  title: "Other Published",
};

Deno.test("published Solo courses that share one stripe_price_id sell, even with many rows", async () => {
  const bulk = Array.from({ length: 500 }, (_, i) => ({
    ...OTHER_PUBLISHED,
    id: `00000000-0000-4000-8000-${String(100000 + i).padStart(12, "0")}`,
    slug: `bulk-${i}`,
  }));
  const loaded = await loadAcademyCourse(
    createCourseClient([PUBLISHED, ...bulk, DRAFT_CATALOG]),
    { courseSlug: "bulk-499" },
  );
  assertEquals(loaded.error, undefined);
  assertEquals(loaded.course?.slug, "bulk-499");
  assertEquals(loaded.course?.stripe_price_id, "price_solo_test");
});

Deno.test("one other published Solo course with a different price fails closed", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([PUBLISHED, { ...OTHER_PUBLISHED, stripe_price_id: "price_other_solo" }]),
    { courseSlug: "published-course" },
  );
  assertEquals(loaded.error?.status, 409);
  assertEquals(loaded.error?.body.error, DRIFT_MESSAGE);
  assertEquals(loaded.course, undefined);
});

Deno.test("a conflicting price far down a large catalog still fails closed", async () => {
  const bulk = Array.from({ length: 500 }, (_, i) => ({
    ...OTHER_PUBLISHED,
    id: `00000000-0000-4000-8000-${String(100000 + i).padStart(12, "0")}`,
    slug: `bulk-${i}`,
  }));
  bulk[499].stripe_price_id = "price_other_solo";
  const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED, ...bulk]), {
    courseSlug: "published-course",
  });
  assertEquals(loaded.error?.status, 409);
  assertEquals(loaded.error?.body.error, DRIFT_MESSAGE);
});

Deno.test("one other published Solo course with a null price fails closed", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([PUBLISHED, { ...OTHER_PUBLISHED, stripe_price_id: null }]),
    { courseId: PUBLISHED.id },
  );
  assertEquals(loaded.error?.status, 409);
  assertEquals(loaded.error?.body.error, DRIFT_MESSAGE);
  assertEquals(loaded.course, undefined);
});

Deno.test("unpublished Solo rows with a different or null price do not block a sale", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([
      PUBLISHED,
      { ...DRAFT_CATALOG, stripe_price_id: "price_draft" },
      { ...DRAFT_CATALOG, id: "00000000-0000-4000-8000-000000002098", stripe_price_id: null },
    ]),
    { courseSlug: "published-course" },
  );
  assertEquals(loaded.course?.id, PUBLISHED.id);
});

Deno.test("a selected course without a price is left to the handler", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([{ ...PUBLISHED, stripe_price_id: null }]),
    { courseSlug: "published-course" },
  );
  assertEquals(loaded.error, undefined);
  assertEquals(loaded.course?.stripe_price_id, null);
});

for (const failOn of ["is", "neq"] as const) {
  Deno.test(`a failing drift query (${failOn}) is a generic 500 and logs the detail`, async () => {
    const logged: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void logged.push(args);
    try {
      const loaded = await loadAcademyCourse(createCourseClient([PUBLISHED], { failOn }), {
        courseSlug: "published-course",
      });
      assertEquals(loaded.error?.status, 500);
      assertEquals(loaded.error?.body.error, "Course lookup failed");
      assertEquals(loaded.course, undefined);
    } finally {
      console.error = original;
    }
    assertEquals(logged.length > 0, true);
    assertEquals(JSON.stringify(logged).includes("secret db detail"), true);
  });
}

Deno.test("a published catalog row that is not solo_bundle is not sold as Solo", async () => {
  const loaded = await loadAcademyCourse(
    createCourseClient([{ ...PUBLISHED, product_code: "team_5" }]),
    { courseSlug: "published-course" },
  );
  assertEquals(loaded.error?.status, 409);
  assertEquals(loaded.error?.body.error, "Published course is not a Solo SKU");
});
