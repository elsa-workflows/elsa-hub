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
  isAcademyStubEnabled,
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
  isAcademyStubEnabled: vi.fn(() => false),
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

vi.mock("./academyEnv", () => ({
  isAcademyStubEnabled,
}));

import {
  ACADEMY_KIT_SIGNED_URL_TTL_SECONDS,
  ACADEMY_KITS_BUCKET,
  ACADEMY_LESSON_LIST_COLUMNS,
  ACADEMY_SOLO_BUNDLE_HASH,
  ACADEMY_SOLO_BUNDLE_ID,
  ACADEMY_SOLO_PRODUCT_CODE,
  academyCheckoutFields,
  canReadLessonBody,
  createAcademyKitSignedUrl,
  fetchLessonBody,
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
    isAcademyStubEnabled.mockReturnValue(false);
    mockQuery();
  });

  it("never asks for body_md when listing lessons", async () => {
    order.mockResolvedValue({ data: [], error: null });

    await listCourseLessons("course-1");

    expect(from).toHaveBeenCalledWith("academy_lessons");
    expect(select).toHaveBeenCalledWith(ACADEMY_LESSON_LIST_COLUMNS);
    expect(ACADEMY_LESSON_LIST_COLUMNS).not.toMatch(/body_md/);
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
      product_codes: [ACADEMY_SOLO_PRODUCT_CODE],
    });
    expect(ACADEMY_SOLO_PRODUCT_CODE).toBe("solo_bundle");
    handleBuyCourse();
    expect(toast.message).toHaveBeenCalled();
  });

  it("detects missing-relation errors so the stub can stand in until #37 merges", () => {
    expect(isMissingAcademyRelation({ code: "42P01", message: "relation does not exist" })).toBe(true);
    expect(isMissingAcademyRelation({ code: "PGRST202", message: "Could not find the function" })).toBe(true);
    expect(isMissingAcademyRelation({ code: "42501", message: "permission denied" })).toBe(false);
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
    expect(select).toHaveBeenCalledWith("body_md");
  });

  describe("when the stub is on", () => {
    beforeEach(() => {
      isAcademyStubEnabled.mockReturnValue(true);
    });

    it("falls back to stub courses when academy_courses is missing", async () => {
      order.mockResolvedValue({ data: null, error: missingTable });
      await expect(listPublishedCourses()).resolves.toEqual(ACADEMY_STUB_COURSES);
    });

    it("still treats a missing has_academy_access RPC as no access", async () => {
      rpc.mockResolvedValue({ data: null, error: missingRpc });
      await expect(hasAcademyAccess("course-1")).resolves.toBe(false);
    });
  });

  describe("when the stub is off", () => {
    beforeEach(() => {
      isAcademyStubEnabled.mockReturnValue(false);
    });

    it("returns an empty course list when academy_courses is missing", async () => {
      order.mockResolvedValue({ data: null, error: missingTable });
      await expect(listPublishedCourses()).resolves.toEqual([]);
    });

    it("returns no lesson body when academy_lessons is missing", async () => {
      maybeSingle.mockResolvedValue({ data: null, error: missingTable });
      await expect(fetchLessonBody("lesson-1")).resolves.toBeNull();
    });

    it("treats a missing has_academy_access RPC as no access", async () => {
      rpc.mockResolvedValue({ data: null, error: missingRpc });
      await expect(hasAcademyAccess("course-1")).resolves.toBe(false);
    });

    it("does not grant access when the RPC errors as missing even if DEV would have allowed stubs", async () => {
      isAcademyStubEnabled.mockReturnValue(true);
      rpc.mockResolvedValue({ data: null, error: missingRpc });
      await expect(hasAcademyAccess("course-1")).resolves.toBe(false);
    });
  });
});
