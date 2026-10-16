import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  toast,
  maybeSingle,
  order,
  eq,
  is,
  select,
  from,
  rpc,
  createSignedUrl,
} = vi.hoisted(() => ({
  toast: { message: vi.fn(), error: vi.fn() },
  maybeSingle: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    rpc: (...args: unknown[]) => rpc(...args),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  },
}));

import {
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
  handleBuyCourse,
  hasAcademyAccess,
  isMissingAcademyRelation,
  lessonPath,
  listCourseKitAssets,
  listCourseLessons,
  listPublishedCourses,
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
    eq,
    is,
    order,
    maybeSingle,
  };
  select.mockReturnValue(query);
  eq.mockReturnValue(query);
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

  it("keeps checkout product fields in academyCheckoutFields only", () => {
    expect(academyCheckoutFields()).toEqual({
      productCode: ACADEMY_SOLO_PRODUCT_CODE,
    });
    expect(academyCheckoutFields()).not.toHaveProperty("organizationId");
    expect(ACADEMY_SOLO_PRODUCT_CODE).toBe("solo_bundle");
    handleBuyCourse();
    expect(toast.message).toHaveBeenCalled();
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

  it("treats a missing has_academy_access RPC as no access", async () => {
    rpc.mockResolvedValue({ data: null, error: missingRpc });
    await expect(hasAcademyAccess("course-1")).resolves.toBe(false);
  });
});
