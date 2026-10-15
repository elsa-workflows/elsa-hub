// Single course lookup for academy-checkout.
// #37 R2 keeps product_code as the unique primary SKU per course row.
// product_codes text[] is the access allow-list used by has_academy_access,
// not the checkout price lookup. Change only this helper if that split moves.

export type AcademyCourseRow = {
  id: string;
  slug: string;
  title: string;
  product_code: string;
  stripe_price_id: string | null;
  price_cents: number;
  currency: string;
};

export type AcademyCourseQuery = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order?: (column: string, options: { ascending: boolean }) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
          };
        };
        limit?: (n: number) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
        };
        maybeSingle: () => Promise<{ data: unknown; error: { message?: string } | null }>;
      };
    };
  };
};

const COURSE_COLUMNS = "id, slug, title, product_code, stripe_price_id, price_cents, currency";

export type LoadAcademyCourseResult = {
  course?: AcademyCourseRow;
  error?: { status: number; body: Record<string, unknown> };
};

export async function loadAcademyCourse(
  serviceClient: AcademyCourseQuery,
  body: { courseId?: string; productCode?: string },
): Promise<LoadAcademyCourseResult> {
  if (body.courseId && body.productCode) {
    return {
      error: { status: 400, body: { error: "Provide either courseId or productCode, not both" } },
    };
  }
  if (!body.courseId && !body.productCode) {
    return {
      error: { status: 400, body: { error: "Either courseId or productCode is required" } },
    };
  }

  if (body.courseId) {
    const result = await serviceClient
      .from("academy_courses")
      .select(COURSE_COLUMNS)
      .eq("id", body.courseId)
      .maybeSingle();
    return readCourse(result);
  }

  return readCourse(await findCourseByProductCode(serviceClient, body.productCode!));
}

async function findCourseByProductCode(
  serviceClient: AcademyCourseQuery,
  productCode: string,
): Promise<{ data: unknown; error: { message?: string } | null }> {
  const query = serviceClient
    .from("academy_courses")
    .select(COURSE_COLUMNS)
    .eq("product_code", productCode);

  const ordered = typeof query.order === "function"
    ? query.order("sort_order", { ascending: true }).limit(1)
    : typeof query.limit === "function"
    ? query.limit(1)
    : query;

  return await ordered.maybeSingle();
}

function readCourse(
  result: { data: unknown; error: { message?: string } | null },
): LoadAcademyCourseResult {
  if (result.error || !result.data) {
    return { error: { status: 404, body: { error: "Course not found" } } };
  }
  return { course: result.data as AcademyCourseRow };
}
