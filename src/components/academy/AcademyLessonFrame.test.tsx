import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { useAuth } = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ user: { id: "user-1" } as { id: string } | null })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

import { AcademyLessonFrame } from "./AcademyLessonFrame";
import { academyProgressStorageKey } from "@/lib/academyLessonNav";
import {
  ACADEMY_NAV_BACK_TO_COURSE,
  ACADEMY_NAV_MARK_COMPLETE,
  ACADEMY_NAV_PROGRESS_DEVICE_NOTE,
  ACADEMY_NAV_PROGRESS_SIGNED_OUT,
} from "@/lib/academyCopy";
import type { Course, LessonSummary } from "@/lib/academy";

const course: Course = {
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
};

const lesson = (id: string, sort_order: number, title: string, is_preview = false): LessonSummary => ({
  id,
  course_id: course.id,
  slug: id,
  title,
  sort_order,
  is_preview,
});

// Out of array order on purpose.
const lessons = [
  lesson("lab-a", 3, "Lab A: first workflow"),
  lesson("start-here", 1, "Start here", true),
  lesson("hosting", 2, "Host Elsa in ASP.NET Core"),
];

const progressKey = academyProgressStorageKey("user-1", course.id);

function renderFrame(current: LessonSummary, opts: { hasAccess?: boolean; canRead?: boolean } = {}) {
  const hasAccess = opts.hasAccess ?? false;
  return render(
    <MemoryRouter initialEntries={[`/academy/${course.slug}/${current.slug}`]}>
      <Routes>
        <Route
          path="/academy/:courseSlug/:lessonSlug"
          element={
            <AcademyLessonFrame
              course={course}
              lesson={current}
              lessons={lessons}
              hasAccess={hasAccess}
              canRead={opts.canRead ?? (hasAccess || current.is_preview)}
            >
              <article>
                <h1>{current.title}</h1>
              </article>
            </AcademyLessonFrame>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function outlineRows() {
  return screen.getAllByTestId("academy-outline-lesson");
}

describe("AcademyLessonFrame", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
  });
  afterEach(() => localStorage.clear());

  it("links Previous and Next to the neighbouring lessons by sort_order, with their titles", () => {
    renderFrame(lessons[2], { hasAccess: true });
    const previous = screen.getByTestId("academy-nav-previous");
    const next = screen.getByTestId("academy-nav-next");
    expect(previous).toHaveTextContent("Start here");
    expect(previous).toHaveAttribute("href", "/academy/fundamentals-core/start-here");
    expect(next).toHaveTextContent("Lab A: first workflow");
    expect(next).toHaveAttribute("href", "/academy/fundamentals-core/lab-a");
  });

  it("hides Previous on the first lesson", () => {
    renderFrame(lessons[1]);
    expect(screen.queryByTestId("academy-nav-previous")).not.toBeInTheDocument();
    expect(screen.getByTestId("academy-nav-next")).toHaveTextContent("Host Elsa in ASP.NET Core");
  });

  it("hides Next on the last lesson", () => {
    renderFrame(lessons[0], { hasAccess: true });
    expect(screen.queryByTestId("academy-nav-next")).not.toBeInTheDocument();
    expect(screen.getByTestId("academy-nav-previous")).toHaveTextContent("Host Elsa in ASP.NET Core");
  });

  it("always offers Back to course", () => {
    renderFrame(lessons[1]);
    expect(screen.getByRole("link", { name: ACADEMY_NAV_BACK_TO_COURSE })).toHaveAttribute(
      "href",
      "/academy/fundamentals-core",
    );
  });

  it("shows Lesson X of Y and the outline in course order", () => {
    renderFrame(lessons[2], { hasAccess: true });
    expect(screen.getByText("Lesson 2 of 3")).toBeInTheDocument();
    expect(outlineRows().map((row) => row.textContent)).toEqual([
      expect.stringContaining("Start here"),
      expect.stringContaining("Host Elsa in ASP.NET Core"),
      expect.stringContaining("Lab A: first workflow"),
    ]);
  });

  it("shows locked lessons as locked for a non-buyer instead of hiding them, previews as open", () => {
    renderFrame(lessons[1]);
    const rows = outlineRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Preview")).toBeInTheDocument();
    expect(within(rows[0]).queryByLabelText("Locked")).not.toBeInTheDocument();
    expect(within(rows[1]).getByLabelText("Locked")).toBeInTheDocument();
    expect(within(rows[2]).getByLabelText("Locked")).toBeInTheDocument();
    // The Next button flags a locked neighbour too.
    expect(within(screen.getByTestId("academy-nav-next")).getByLabelText("Locked")).toBeInTheDocument();
  });

  it("unlocks paid rows for a buyer", () => {
    renderFrame(lessons[1], { hasAccess: true });
    expect(screen.queryByLabelText("Locked")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Unlocked")).toHaveLength(2);
  });

  it("highlights the current lesson", () => {
    renderFrame(lessons[2], { hasAccess: true });
    const current = within(outlineRows()[1]).getByRole("link");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(within(outlineRows()[0]).getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("shows done, current and upcoming states and the X of Y done count", () => {
    localStorage.setItem(progressKey, JSON.stringify(["start-here"]));
    renderFrame(lessons[2], { hasAccess: true });
    expect(outlineRows().map((row) => row.getAttribute("data-state"))).toEqual(["done", "current", "upcoming"]);
    expect(within(outlineRows()[0]).getByLabelText("Done")).toBeInTheDocument();
    expect(within(outlineRows()[1]).getByLabelText("Current lesson")).toBeInTheDocument();
    expect(within(outlineRows()[2]).getByLabelText("Up next")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(ACADEMY_NAV_PROGRESS_DEVICE_NOTE).toBe("Progress is saved in this browser.");
    expect(within(screen.getByTestId("academy-outline-summary")).getByText(ACADEMY_NAV_PROGRESS_DEVICE_NOTE)).toBeInTheDocument();
  });

  it("tells a signed-in reader that progress is saved in this browser, next to the bar", () => {
    renderFrame(lessons[1]);
    const summary = screen.getByTestId("academy-outline-summary");
    expect(within(summary).getByText("0 of 3 done")).toBeInTheDocument();
    expect(within(summary).getByText("Progress is saved in this browser.")).toBeInTheDocument();
  });

  it("Mark complete stores the lesson for this user and course and updates the count", () => {
    renderFrame(lessons[2], { hasAccess: true });
    expect(screen.getByText("0 of 3 done")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: ACADEMY_NAV_MARK_COMPLETE }));
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(outlineRows()[1]).toHaveAttribute("data-state", "done");
    expect(JSON.parse(localStorage.getItem(progressKey) ?? "[]")).toEqual(["hosting"]);
  });

  it("marks the lesson done when the reader goes to Next", () => {
    renderFrame(lessons[1]);
    fireEvent.click(screen.getByTestId("academy-nav-next"));
    expect(JSON.parse(localStorage.getItem(progressKey) ?? "[]")).toEqual(["start-here"]);
  });

  it("offers no Mark complete on a locked lesson", () => {
    renderFrame(lessons[2], { hasAccess: false, canRead: false });
    expect(screen.queryByRole("button", { name: ACADEMY_NAV_MARK_COMPLETE })).not.toBeInTheDocument();
  });

  it("does not track progress for a signed-out visitor", () => {
    useAuth.mockReturnValue({ user: null });
    renderFrame(lessons[1]);
    expect(screen.getByText(ACADEMY_NAV_PROGRESS_SIGNED_OUT)).toBeInTheDocument();
    expect(screen.queryByText(/of 3 done/)).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_NAV_PROGRESS_DEVICE_NOTE)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_NAV_MARK_COMPLETE })).not.toBeInTheDocument();
    expect(screen.getByText("Lesson 1 of 3")).toBeInTheDocument();
  });
});
