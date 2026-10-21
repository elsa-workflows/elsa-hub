import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const { getLessonPageMeta, hasAcademyAccess, fetchLessonBody, listLessonAssets, useAuth } = vi.hoisted(() => ({
  getLessonPageMeta: vi.fn(),
  hasAcademyAccess: vi.fn(),
  fetchLessonBody: vi.fn(),
  listLessonAssets: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return {
    ...actual,
    getLessonPageMeta,
    hasAcademyAccess,
    fetchLessonBody,
    listLessonAssets,
  };
});

import { useAcademyLesson } from "./useAcademyLesson";

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

const previewLesson = {
  id: "lesson-preview",
  course_id: "course-1",
  slug: "welcome",
  title: "Welcome",
  sort_order: 1,
  is_preview: true,
};

const paidLesson = {
  id: "lesson-paid",
  course_id: "course-1",
  slug: "hosting",
  title: "Hosting",
  sort_order: 2,
  is_preview: false,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAcademyLesson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLessonBody.mockResolvedValue("# Body");
    listLessonAssets.mockResolvedValue([
      {
        id: "asset-1",
        course_id: "course-1",
        lesson_id: "lesson-paid",
        label: "Lab kit",
        storage_path: "solo/kit.zip",
      },
    ]);
  });

  it("loads a preview lesson body for an anonymous visitor without checking entitlement", async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    getLessonPageMeta.mockResolvedValue({ course, lesson: previewLesson });

    const { result } = renderHook(() => useAcademyLesson("solo", "welcome"), { wrapper });

    await waitFor(() => expect(result.current.bodyMd).toBe("# Body"));
    expect(result.current.canRead).toBe(true);
    expect(fetchLessonBody).toHaveBeenCalledWith("lesson-preview");
    expect(hasAcademyAccess).not.toHaveBeenCalled();
    expect(listLessonAssets).not.toHaveBeenCalled();
  });

  it("does not fetch body_md for a signed-in unentitled user on a paid lesson", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    getLessonPageMeta.mockResolvedValue({ course, lesson: paidLesson });
    hasAcademyAccess.mockResolvedValue(false);

    const { result } = renderHook(() => useAcademyLesson("solo", "hosting"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canRead).toBe(false);
    expect(result.current.bodyMd).toBeNull();
    expect(hasAcademyAccess).toHaveBeenCalledWith("course-1");
    expect(fetchLessonBody).not.toHaveBeenCalled();
    expect(listLessonAssets).not.toHaveBeenCalled();
  });

  it("fetches body_md and kit assets for an entitled user", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    getLessonPageMeta.mockResolvedValue({ course, lesson: paidLesson });
    hasAcademyAccess.mockResolvedValue(true);

    const { result } = renderHook(() => useAcademyLesson("solo", "hosting"), { wrapper });

    await waitFor(() => expect(result.current.bodyMd).toBe("# Body"));
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.assets).toHaveLength(1);
    expect(fetchLessonBody).toHaveBeenCalledWith("lesson-paid");
    expect(listLessonAssets).toHaveBeenCalledWith("course-1", "lesson-paid");
  });
});
