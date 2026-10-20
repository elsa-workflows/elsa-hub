import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const { getPublishedCourseBySlug, listCourseLessons, hasAcademyAccess, listCourseKitAssets, useAuth } =
  vi.hoisted(() => ({
    getPublishedCourseBySlug: vi.fn(),
    listCourseLessons: vi.fn(),
    hasAcademyAccess: vi.fn(),
    listCourseKitAssets: vi.fn(),
    useAuth: vi.fn(),
  }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return {
    ...actual,
    getPublishedCourseBySlug,
    listCourseLessons,
    hasAcademyAccess,
    listCourseKitAssets,
  };
});

import { useAcademyCourse } from "./useAcademyCourse";

const course = {
  id: "course-1",
  slug: "solo",
  title: "Solo Bundle",
  summary: "Self-paced course",
  sort_order: 1,
  is_published: true,
  price_cents: 2900,
  currency: "eur",
  stripe_price_id: null,
  product_code: "solo_bundle",
};

const lesson = {
  id: "lesson-1",
  course_id: "course-1",
  slug: "welcome",
  title: "Welcome",
  sort_order: 1,
  is_preview: true,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAcademyCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublishedCourseBySlug.mockResolvedValue(course);
    listCourseLessons.mockResolvedValue([lesson]);
    listCourseKitAssets.mockResolvedValue([]);
  });

  it("stays loading while the entitlement check of a signed-in user is pending", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    hasAcademyAccess.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAcademyCourse("solo"), { wrapper });

    await waitFor(() => expect(result.current.lessons).toHaveLength(1));
    expect(hasAcademyAccess).toHaveBeenCalledWith("course-1");
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasAccess).toBe(false);
  });

  it("stays loading while auth is still resolving", async () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    const { result } = renderHook(() => useAcademyCourse("solo"), { wrapper });

    await waitFor(() => expect(result.current.lessons).toHaveLength(1));
    expect(result.current.isLoading).toBe(true);
    expect(hasAcademyAccess).not.toHaveBeenCalled();
  });

  it("finishes loading for an anonymous visitor without checking entitlement", async () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    const { result } = renderHook(() => useAcademyCourse("solo"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(false);
    expect(hasAcademyAccess).not.toHaveBeenCalled();
  });

  it("finishes loading with access for an entitled user", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    hasAcademyAccess.mockResolvedValue(true);

    const { result } = renderHook(() => useAcademyCourse("solo"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAccess).toBe(true);
  });
});
