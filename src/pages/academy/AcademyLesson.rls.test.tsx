import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { fetchLessonBody, getLessonPageMeta, hasAcademyAccess, listLessonAssets, useAuth } = vi.hoisted(
  () => ({
    fetchLessonBody: vi.fn(),
    getLessonPageMeta: vi.fn(),
    hasAcademyAccess: vi.fn(),
    listLessonAssets: vi.fn(),
    useAuth: vi.fn(),
  }),
);

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
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

import AcademyLesson from "./AcademyLesson";
import { ACADEMY_SOLO_BUY_LABEL, ACADEMY_SOLO_LOCKED_HEADING } from "@/lib/academyCopy";

const course = {
  id: "course-1",
  slug: "fundamentals-core",
  title: "Fundamentals Core",
  summary: "Self-paced Elsa 3 course.",
  sort_order: 1,
  is_published: true,
  price_cents: 2900,
  currency: "eur",
  stripe_price_id: null,
  product_code: "solo_bundle",
};

const paidLesson = {
  id: "lesson-paid",
  course_id: "course-1",
  slug: "host-elsa-in-aspnet-core",
  title: "Host Elsa in ASP.NET Core",
  sort_order: 2,
  is_preview: false,
};

function LoginProbe() {
  const location = useLocation();
  return <div>{`login${location.search}`}</div>;
}

function renderPaidLesson() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/academy/fundamentals-core/host-elsa-in-aspnet-core"]}>
          <Routes>
            <Route path="/academy/:courseSlug/:lessonSlug" element={<AcademyLesson />} />
            <Route path="/login" element={<LoginProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("Academy lesson pages against RLS-shaped mocks", () => {
  it("sends a signed-out visitor on a paid lesson to login when the table hides the row", async () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    getLessonPageMeta.mockImplementation(async () => {
      const tableRow = null;
      const outlineRow = paidLesson;
      expect(tableRow).toBeNull();
      return { course, lesson: outlineRow };
    });
    fetchLessonBody.mockResolvedValue(null);

    renderPaidLesson();

    await waitFor(() => {
      expect(
        screen.getByText(
          "login?redirect=%2Facademy%2Ffundamentals-core%2Fhost-elsa-in-aspnet-core",
        ),
      ).toBeInTheDocument();
    });
    expect(fetchLessonBody).not.toHaveBeenCalled();
    expect(screen.queryByText("Lesson not found")).not.toBeInTheDocument();
  });

  it("shows the lock panel for a signed-in unentitled user when the table hides the paid row", async () => {
    useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
    getLessonPageMeta.mockImplementation(async () => {
      const tableRow = null;
      return { course, lesson: paidLesson ?? tableRow };
    });
    hasAcademyAccess.mockResolvedValue(false);
    fetchLessonBody.mockResolvedValue(null);
    listLessonAssets.mockResolvedValue([]);

    renderPaidLesson();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: ACADEMY_SOLO_LOCKED_HEADING })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText("Lesson not found")).not.toBeInTheDocument();
    expect(fetchLessonBody).not.toHaveBeenCalled();
  });
});
