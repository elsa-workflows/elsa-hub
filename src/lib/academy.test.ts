import { beforeEach, describe, expect, it, vi } from "vitest";

const { toast, maybeSingle, order, eq, is, select, from, rpc, createSignedUrl } = vi.hoisted(() => ({
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
  ACADEMY_LESSON_LIST_COLUMNS,
  canReadLessonBody,
  createAcademyKitSignedUrl,
  fetchLessonBody,
  handleBuyCourse,
  isMissingAcademyRelation,
  lessonPath,
  listCourseKitAssets,
  listCourseLessons,
  listPublishedCourses,
} from "./academy";
import { ACADEMY_STUB_COURSES } from "./academyStub";

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

  it("falls back to stub courses when the academy_courses table is missing", async () => {
    order.mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find the table 'public.academy_courses' in the schema cache" },
    });

    await expect(listPublishedCourses()).resolves.toEqual(ACADEMY_STUB_COURSES);
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

  it("exposes a single handleBuyCourse placeholder for later checkout wiring", () => {
    handleBuyCourse({
      id: "c1",
      slug: "solo",
      title: "Solo Bundle",
      stripe_price_id: null,
      product_code: "solo_bundle",
    });
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
});
