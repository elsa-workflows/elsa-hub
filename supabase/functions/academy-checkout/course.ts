// Single course lookup for academy-checkout.
// Solo: published catalog row by slug or id. Every catalog course uses
// product_code solo_bundle, so a product_code lookup is not unique.
// The Solo Stripe price is the one shared stripe_price_id on every
// published solo_bundle row. Any published row with a different or missing
// price fails closed, however large the catalog is.
// Team: exactly one unpublished SKU row at slug team-5 or team-10.
// That row's product_code must equal the requested SKU.

import { SOLO_PRODUCT_CODE, teamSkuSlug } from "./product.ts";

export type AcademyCourseRow = {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  stripe_price_id: string | null;
  price_cents: number;
  currency: string;
  is_published?: boolean;
};

export type AcademyCourseQuery = {
  from: (table: string) => {
    select: (columns: string) => AcademyCourseFilter;
  };
};

export type AcademyCourseFilter = {
  eq: (column: string, value: string | boolean) => AcademyCourseFilter;
  is: (column: string, value: null) => AcademyCourseFilter;
  neq: (column: string, value: string) => AcademyCourseFilter;
  limit: (n: number) => Promise<{ data: unknown[] | null; error: { message?: string; code?: string } | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
};

const COURSE_COLUMNS = "id, slug, title, product_code, stripe_price_id, price_cents, currency, is_published";

export type LoadAcademyCourseResult = {
  course?: AcademyCourseRow;
  error?: { status: number; body: Record<string, unknown> };
};

export async function loadAcademyCourse(
  serviceClient: AcademyCourseQuery,
  body: { courseId?: string; courseSlug?: string; productCode?: string },
): Promise<LoadAcademyCourseResult> {
  const teamSlug = body.productCode ? teamSkuSlug(body.productCode) : null;
  if (teamSlug) {
    const loaded = await loadExactlyOneBySlug(serviceClient, teamSlug);
    if (loaded.error || !loaded.course) return loaded;
    if (loaded.course.product_code !== body.productCode) {
      return {
        error: {
          status: 409,
          body: { error: "Team SKU row product_code does not match the requested SKU" },
        },
      };
    }
    return loaded;
  }

  if (body.productCode === SOLO_PRODUCT_CODE && !body.courseSlug && !body.courseId) {
    return {
      error: {
        status: 400,
        body: { error: "A published course slug is required for Solo" },
      },
    };
  }

  if (body.productCode && body.productCode !== SOLO_PRODUCT_CODE) {
    return {
      error: { status: 400, body: { error: "Unsupported Academy product" } },
    };
  }

  const selectors = [body.courseId, body.courseSlug].filter(Boolean);
  if (selectors.length > 1) {
    return {
      error: { status: 400, body: { error: "Provide either courseId or courseSlug, not both" } },
    };
  }
  if (selectors.length === 0) {
    return {
      error: {
        status: 400,
        body: { error: "Either courseId, courseSlug or a Team productCode is required" },
      },
    };
  }

  const loaded = body.courseSlug
    ? await loadPublished(serviceClient, "slug", body.courseSlug)
    : await loadPublished(serviceClient, "id", body.courseId!);
  if (loaded.error || !loaded.course) return loaded;
  return assertSharedSoloBundlePrice(serviceClient, loaded.course);
}

async function loadPublished(
  serviceClient: AcademyCourseQuery,
  column: "id" | "slug",
  value: string,
): Promise<LoadAcademyCourseResult> {
  const result = await serviceClient
    .from("academy_courses")
    .select(COURSE_COLUMNS)
    .eq(column, value)
    .eq("is_published", true)
    .maybeSingle();
  return readOne(result, "Course not found");
}

async function loadExactlyOneBySlug(
  serviceClient: AcademyCourseQuery,
  slug: string,
): Promise<LoadAcademyCourseResult> {
  const query = serviceClient
    .from("academy_courses")
    .select(COURSE_COLUMNS)
    .eq("slug", slug);

  const listed = await query.limit(2);
  if (listed.error) return lookupFailed(listed.error);
  const rows = Array.isArray(listed.data) ? listed.data : listed.data ? [listed.data] : [];
  if (rows.length === 0) {
    return { error: { status: 404, body: { error: "Course not found" } } };
  }
  if (rows.length > 1) {
    return { error: { status: 409, body: { error: "Ambiguous Team SKU row" } } };
  }
  return { course: rows[0] as AcademyCourseRow };
}

async function assertSharedSoloBundlePrice(
  serviceClient: AcademyCourseQuery,
  course: AcademyCourseRow,
): Promise<LoadAcademyCourseResult> {
  if (course.product_code !== SOLO_PRODUCT_CODE) {
    return {
      error: {
        status: 409,
        body: { error: "Published course is not a Solo SKU" },
      },
    };
  }

  // A course without a price is left to the handler's "not configured" 400.
  const price = course.stripe_price_id;
  if (!price) return { course };

  // Look for any published solo_bundle row that disagrees: a null price, or a
  // different one. Two typed filters rather than one .or() string, so the price
  // is never interpolated into a PostgREST filter expression. SQL neq skips
  // NULL, hence the separate null query. Neither query is bounded by catalog
  // size.
  const drifted = (column: (q: AcademyCourseFilter) => AcademyCourseFilter) =>
    column(
      serviceClient
        .from("academy_courses")
        .select("id")
        .eq("product_code", SOLO_PRODUCT_CODE)
        .eq("is_published", true),
    ).limit(1);
  const [nullPrice, otherPrice] = await Promise.all([
    drifted((q) => q.is("stripe_price_id", null)),
    drifted((q) => q.neq("stripe_price_id", price)),
  ]);
  const failed = nullPrice.error ?? otherPrice.error;
  if (failed) return lookupFailed(failed);

  if ((nullPrice.data?.length ?? 0) > 0 || (otherPrice.data?.length ?? 0) > 0) {
    return {
      error: {
        status: 409,
        body: { error: "Published Solo courses have conflicting Stripe prices" },
      },
    };
  }

  return { course };
}

function lookupFailed(error: { message?: string; code?: string }): LoadAcademyCourseResult {
  console.error("Academy course lookup failed:", error);
  return { error: { status: 500, body: { error: "Course lookup failed" } } };
}

function readOne(
  result: { data: unknown; error: { message?: string; code?: string } | null },
  missing: string,
): LoadAcademyCourseResult {
  if (result.error?.code === "PGRST116") {
    return { error: { status: 409, body: { error: "Ambiguous course row" } } };
  }
  if (result.error) return lookupFailed(result.error);
  if (!result.data) {
    return { error: { status: 404, body: { error: missing } } };
  }
  return { course: result.data as AcademyCourseRow };
}
