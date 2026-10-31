import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  toast,
  maybeSingle,
  order,
  eq,
  or,
  is,
  select,
  from,
  rpc,
  createSignedUrl,
  invoke,
} = vi.hoisted(() => ({
  toast: { message: vi.fn(), error: vi.fn() },
  maybeSingle: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  createSignedUrl: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  },
}));

import {
  ACADEMY_ALREADY_OWNED,
  ACADEMY_KIT_SIGNED_URL_TTL_SECONDS,
  ACADEMY_KITS_BUCKET,
  ACADEMY_SOLO_BUNDLE_HASH,
  ACADEMY_SOLO_BUNDLE_ID,
  ACADEMY_SOLO_PRODUCT_CODE,
  academyCheckoutFields,
  canReadLessonBody,
  createAcademyKitSignedUrl,
  fetchLessonBody,
  getLessonPageMeta,
  academyNavigate,
  handleBuyCourse,
  hasAcademyAccess,
  isAcademyAlreadyOwnedError,
  isMissingAcademyRelation,
  lessonPath,
  listCourseKitAssets,
  listCourseLessons,
  listPersonalAcademyGrants,
  listPublishedCourses,
  scrollAcademyCatalogAnchorIntoView,
  scrollAcademySoloBundleIntoView,
} from "./academy";
import { ACADEMY_STUB_COURSES } from "./academyStub";

const missingTable = {
  code: "PGRST205",
  message: "Could not find the table 'public.academy_courses' in the schema cache",
};

const missingRpc = {
  code: "PGRST202",
  message: "Could not find the function public.has_academy_access",
};

const publishedCourse = {
  id: "course-1",
  slug: "fundamentals-core",
  title: "Fundamentals Core",
  summary: "Self-paced course",
  sort_order: 1,
  is_published: true,
  price_cents: 2900,
  currency: "eur",
  stripe_price_id: null,
  product_code: "solo_bundle",
};

const outlineRows = [
  { id: "lesson-preview", slug: "welcome", title: "Welcome", sort_order: 1, is_preview: true },
  { id: "lesson-paid", slug: "hosting", title: "Hosting", sort_order: 2, is_preview: false },
];

function mockQuery() {
  const query = {
    select,
    or,
    eq,
    is,
    order,
    maybeSingle,
  };
  select.mockReturnValue(query);
  eq.mockReturnValue(query);
  or.mockReturnValue(query);
  is.mockReturnValue(query);
  order.mockReturnValue(query);
  from.mockReturnValue(query);
  return query;
}

describe("academy data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery();
  });

  it("lists lessons from academy_course_outline so paid rows survive RLS", async () => {
    rpc.mockResolvedValue({ data: outlineRows, error: null });

    await expect(listCourseLessons("course-1")).resolves.toEqual([
      { ...outlineRows[0], course_id: "course-1" },
      { ...outlineRows[1], course_id: "course-1" },
    ]);
    expect(rpc).toHaveBeenCalledWith("academy_course_outline", { p_course_id: "course-1" });
    expect(from).not.toHaveBeenCalledWith("academy_lessons");
  });

  it("resolves paid lesson meta from the outline when the table would hide the row", async () => {
    maybeSingle.mockResolvedValue({ data: publishedCourse, error: null });
    rpc.mockResolvedValue({ data: outlineRows, error: null });

    await expect(getLessonPageMeta("fundamentals-core", "hosting")).resolves.toEqual({
      course: publishedCourse,
      lesson: { ...outlineRows[1], course_id: "course-1" },
      lessons: outlineRows.map((row) => ({ ...row, course_id: "course-1" })),
    });
    expect(from).toHaveBeenCalledWith("academy_courses");
    expect(from).not.toHaveBeenCalledWith("academy_lessons");
    expect(rpc).toHaveBeenCalledWith("academy_course_outline", { p_course_id: "course-1" });
  });

  it("builds lesson links as /academy/<course>/<lesson>", () => {
    expect(lessonPath("elsa-3-solo-bundle", "welcome")).toBe("/academy/elsa-3-solo-bundle/welcome");
  });

  it("treats preview lessons as readable without an entitlement", () => {
    expect(canReadLessonBody({ is_preview: true }, false)).toBe(true);
    expect(canReadLessonBody({ is_preview: false }, false)).toBe(false);
    expect(canReadLessonBody({ is_preview: false }, true)).toBe(true);
  });

  it("creates kit signed URLs from the private academy-kits bucket with a 10 minute TTL", async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.test/kit.zip" },
      error: null,
    });

    await expect(createAcademyKitSignedUrl("solo/kit.zip")).resolves.toBe("https://example.test/kit.zip");
    expect(ACADEMY_KITS_BUCKET).toBe("academy-kits");
    expect(ACADEMY_KIT_SIGNED_URL_TTL_SECONDS).toBeLessThanOrEqual(600);
    expect(createSignedUrl).toHaveBeenCalledWith("solo/kit.zip", 600, { download: true });
  });

  it("scrolls to the Solo Bundle panel only for #solo-bundle", () => {
    const scrollIntoView = vi.fn();
    expect(ACADEMY_SOLO_BUNDLE_ID).toBe("solo-bundle");
    expect(ACADEMY_SOLO_BUNDLE_HASH).toBe("#solo-bundle");
    expect(scrollAcademySoloBundleIntoView("#other", () => ({ scrollIntoView }))).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scrollAcademySoloBundleIntoView("#solo-bundle", () => null)).toBe(false);
    expect(scrollAcademySoloBundleIntoView("#solo-bundle", () => ({ scrollIntoView }))).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("scrolls catalogue sections only for their own hash", () => {
    const scrollIntoView = vi.fn();
    const find = vi.fn(() => ({ scrollIntoView }));
    expect(scrollAcademyCatalogAnchorIntoView("#other", find)).toBe(false);
    expect(find).not.toHaveBeenCalled();
    expect(scrollAcademyCatalogAnchorIntoView("#my-courses", () => null)).toBe(false);
    expect(scrollAcademyCatalogAnchorIntoView("#my-courses", find)).toBe(true);
    expect(find).toHaveBeenCalledWith("my-courses");
    expect(scrollAcademySoloBundleIntoView("#my-courses", find)).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("keeps checkout product fields in academyCheckoutFields only", () => {
    expect(academyCheckoutFields("course-1")).toEqual({ courseId: "course-1" });
    expect(academyCheckoutFields("course-1")).not.toHaveProperty("organizationId");
    expect(academyCheckoutFields("course-1")).not.toHaveProperty("productCode");
    expect(ACADEMY_SOLO_PRODUCT_CODE).toBe("solo_bundle");
  });

  it("starts Solo checkout through academy-checkout and redirects to Stripe", async () => {
    const assign = vi.spyOn(academyNavigate, "assign").mockImplementation(() => {});
    invoke.mockResolvedValueOnce({
      data: { checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_x", sessionId: "cs_live_x" },
      error: null,
    });
    await expect(handleBuyCourse("course-1")).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith("academy-checkout", { body: { courseId: "course-1" } });
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_live_x");
    expect(toast.message).not.toHaveBeenCalled();
    assign.mockRestore();
  });

  it("buys through the first published course when no course id is passed", async () => {
    const assign = vi.spyOn(academyNavigate, "assign").mockImplementation(() => {});
    order.mockResolvedValueOnce({
      data: [
        { ...publishedCourse, id: "course-first" },
        { ...publishedCourse, id: "course-second", slug: "second" },
      ],
      error: null,
    });
    invoke.mockResolvedValueOnce({
      data: { checkoutUrl: "https://checkout.stripe.com/c/pay/cs_live_y", sessionId: "cs_live_y" },
      error: null,
    });

    await expect(handleBuyCourse()).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledWith("academy_courses");
    expect(eq).toHaveBeenCalledWith("is_published", true);
    expect(order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(invoke).toHaveBeenCalledWith("academy-checkout", { body: { courseId: "course-first" } });
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_live_y");
    assign.mockRestore();
  });

  it("refuses to start checkout when no course id is passed and none is published", async () => {
    const assign = vi.spyOn(academyNavigate, "assign").mockImplementation(() => {});
    order.mockResolvedValueOnce({ data: [], error: null });

    await expect(handleBuyCourse()).rejects.toThrow("No published Academy course to buy");
    expect(invoke).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    assign.mockRestore();
  });

  it("rejects with the invoke error so the CTA can handle 409 already_owned", async () => {
    const assign = vi.spyOn(academyNavigate, "assign").mockImplementation(() => {});
    const failure = { context: new Response(JSON.stringify({ error: ACADEMY_ALREADY_OWNED }), { status: 409 }) };
    invoke.mockResolvedValueOnce({ data: null, error: failure });
    await expect(handleBuyCourse("course-1")).rejects.toBe(failure);
    expect(assign).not.toHaveBeenCalled();
    assign.mockRestore();
  });

  it("refuses a checkout response without an https URL", async () => {
    const assign = vi.spyOn(academyNavigate, "assign").mockImplementation(() => {});
    invoke.mockResolvedValueOnce({ data: {}, error: null });
    await expect(handleBuyCourse("course-1")).rejects.toThrow("no checkout URL");
    expect(assign).not.toHaveBeenCalled();
    assign.mockRestore();
  });

  it("detects missing-relation errors from codes only", () => {
    expect(isMissingAcademyRelation({ code: "42P01", message: "relation does not exist" })).toBe(true);
    expect(isMissingAcademyRelation({ code: "PGRST202", message: "Could not find the function" })).toBe(true);
    expect(isMissingAcademyRelation({ code: "42883", message: "function does not exist" })).toBe(true);
    expect(isMissingAcademyRelation({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isMissingAcademyRelation({ message: 'column "product_codes" does not exist' })).toBe(false);
  });

  it("lists course kits from academy_assets rows where lesson_id is null", async () => {
    order.mockResolvedValue({ data: [], error: null });

    await listCourseKitAssets("course-1");

    expect(from).toHaveBeenCalledWith("academy_assets");
    expect(or).toHaveBeenCalledWith("course_id.eq.course-1,storage_path.like.kits/*");
    expect(is).toHaveBeenCalledWith("lesson_id", null);
  });

  it("fetches body_md only through fetchLessonBody", async () => {
    maybeSingle.mockResolvedValue({ data: { body_md: "# Hello" }, error: null });

    await expect(fetchLessonBody("lesson-1")).resolves.toBe("# Hello");
    expect(from).toHaveBeenCalledWith("academy_lessons");
    expect(select).toHaveBeenCalledWith("body_md");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("throws when a column is missing instead of showing an empty catalogue", async () => {
    order.mockResolvedValue({
      data: null,
      error: { message: 'column "product_codes" does not exist' },
    });
    await expect(listPublishedCourses()).rejects.toMatchObject({
      message: 'column "product_codes" does not exist',
    });
  });

  it("falls back to stub courses when academy_courses is missing in DEV", async () => {
    order.mockResolvedValue({ data: null, error: missingTable });
    await expect(listPublishedCourses()).resolves.toEqual(ACADEMY_STUB_COURSES);
  });

  it("reads only the user's own active personal grants, since RLS shows admins every row", async () => {
    const grant = { course_id: null, product_code: "solo_bundle" };
    is.mockResolvedValueOnce({ data: [grant], error: null });

    await expect(listPersonalAcademyGrants("user-1")).resolves.toEqual([grant]);
    expect(from).toHaveBeenCalledWith("academy_entitlements");
    expect(select).toHaveBeenCalledWith("course_id, product_code");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(eq).toHaveBeenCalledWith("subject_type", "user");
    expect(is).toHaveBeenCalledWith("revoked_at", null);
  });

  it("treats missing academy_entitlements as no personal grants and rethrows other errors", async () => {
    is.mockResolvedValueOnce({ data: null, error: missingTable });
    await expect(listPersonalAcademyGrants("user-1")).resolves.toEqual([]);

    is.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } });
    await expect(listPersonalAcademyGrants("user-1")).rejects.toMatchObject({ code: "42501" });
  });

  it("treats a missing has_academy_access RPC as no access", async () => {
    rpc.mockResolvedValue({ data: null, error: missingRpc });
    await expect(hasAcademyAccess("course-1")).resolves.toBe(false);
  });
});

describe("isAcademyAlreadyOwnedError", () => {
  // supabase.functions.invoke puts the function's Response on error.context.
  const invokeError = (status: number, body: unknown) => ({
    name: "FunctionsHttpError",
    context: new Response(JSON.stringify(body), { status }),
  });

  it("recognises academy-checkout's 409 already_owned", async () => {
    await expect(
      isAcademyAlreadyOwnedError(invokeError(409, { error: ACADEMY_ALREADY_OWNED })),
    ).resolves.toBe(true);
  });

  it.each([
    ["another 409", invokeError(409, { error: "Ambiguous course row" })],
    ["a 500", invokeError(500, { error: ACADEMY_ALREADY_OWNED })],
    ["a non-JSON 409", { context: new Response("conflict", { status: 409 }) }],
    ["a network error", new Error("Failed to fetch")],
    ["null", null],
  ])("is false for %s", async (_label, error) => {
    await expect(isAcademyAlreadyOwnedError(error)).resolves.toBe(false);
  });
});
