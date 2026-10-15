// Single course lookup for academy-checkout.
// Solo: published catalog row by slug or id. Every catalog course uses
// product_code solo_bundle, so a product_code lookup is not unique.
// Team: exactly one unpublished SKU row at slug team-5 or team-10.
// Those SKU rows are the only unpublished rows that may be sold.

import { teamSkuSlug } from "./product.ts";

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
    return loadExactlyOneBySlug(serviceClient, teamSlug);
  }

  if (body.productCode === "solo_bundle" && !body.courseSlug && !body.courseId) {
    return {
      error: {
        status: 400,
        body: { error: "A published course slug is required for Solo" },
      },
    };
  }

  if (body.productCode && body.productCode !== "solo_bundle") {
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

  if (body.courseSlug) {
    return loadPublished(serviceClient, "slug", body.courseSlug);
  }
  return loadPublished(serviceClient, "id", body.courseId!);
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
  if (listed.error) {
    return { error: { status: 500, body: { error: listed.error.message || "Course lookup failed" } } };
  }
  const rows = Array.isArray(listed.data) ? listed.data : listed.data ? [listed.data] : [];
  if (rows.length === 0) {
    return { error: { status: 404, body: { error: "Course not found" } } };
  }
  if (rows.length > 1) {
    return { error: { status: 409, body: { error: "Ambiguous Team SKU row" } } };
  }
  return { course: rows[0] as AcademyCourseRow };
}

function readOne(
  result: { data: unknown; error: { message?: string; code?: string } | null },
  missing: string,
): LoadAcademyCourseResult {
  if (result.error?.code === "PGRST116") {
    return { error: { status: 409, body: { error: "Ambiguous course row" } } };
  }
  if (result.error || !result.data) {
    return { error: { status: 404, body: { error: missing } } };
  }
  return { course: result.data as AcademyCourseRow };
}
