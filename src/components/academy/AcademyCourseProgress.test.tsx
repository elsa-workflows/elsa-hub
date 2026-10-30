import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { useAuth } = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ user: { id: "user-1" } as { id: string } | null })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

import { AcademyCourseProgress } from "./AcademyCourseProgress";
import { academyProgressStorageKey } from "@/lib/academyLessonNav";
import type { Course, LessonSummary } from "@/lib/academy";
import { ACADEMY_NAV_PROGRESS_DEVICE_NOTE } from "@/lib/academyCopy";

const course = {
  id: "course-1",
  slug: "fundamentals-core",
  title: "Fundamentals Core",
  summary: null,
  sort_order: 1,
  is_published: true,
  price_cents: 2900,
  currency: "eur",
  stripe_price_id: null,
  product_code: "solo_bundle",
  product_codes: ["solo_bundle"],
} satisfies Course;

const lessons: LessonSummary[] = [
  { id: "l1", course_id: "course-1", slug: "start-here", title: "Start here", sort_order: 1, is_preview: true },
  { id: "l2", course_id: "course-1", slug: "hosting", title: "Hosting", sort_order: 2, is_preview: false },
  { id: "l3", course_id: "course-1", slug: "lab-a", title: "Lab A", sort_order: 3, is_preview: false },
];

function renderProgress() {
  return render(
    <MemoryRouter>
      <AcademyCourseProgress course={course} lessons={lessons} hasAccess />
    </MemoryRouter>,
  );
}

describe("AcademyCourseProgress", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  it("shows X of Y done and makes the first unfinished lesson current", () => {
    localStorage.setItem(academyProgressStorageKey("user-1", "course-1"), JSON.stringify(["l1"]));
    renderProgress();
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(screen.getByText(ACADEMY_NAV_PROGRESS_DEVICE_NOTE)).toBeInTheDocument();
    expect(screen.getAllByTestId("academy-outline-lesson").map((row) => row.getAttribute("data-state"))).toEqual([
      "done",
      "current",
      "upcoming",
    ]);
  });

  it("shows no progress for a signed-out visitor", () => {
    useAuth.mockReturnValue({ user: null });
    renderProgress();
    expect(screen.queryByText(/of 3 done/)).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_NAV_PROGRESS_DEVICE_NOTE)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("academy-outline-lesson")[0]).not.toHaveAttribute("data-state");
  });
});
