import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ACADEMY_COURSES_ALIAS_PATH, ACADEMY_PATH } from "./academyPaths";

function Where({ label }: { label: string }) {
  const location = useLocation();
  return <p>{`${label} ${location.pathname}`}</p>;
}

// Mirrors the Academy routes in App.tsx: the static alias must outrank the
// :courseSlug param route so "courses" is never treated as a course slug.
function renderAcademyRoutes(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={ACADEMY_PATH} element={<Where label="catalogue" />} />
        <Route path={ACADEMY_COURSES_ALIAS_PATH} element={<Navigate to={ACADEMY_PATH} replace />} />
        <Route path={`${ACADEMY_PATH}/:courseSlug`} element={<Where label="course" />} />
        <Route path={`${ACADEMY_PATH}/:courseSlug/:lessonSlug`} element={<Where label="lesson" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("academy routes", () => {
  it("defines /academy/courses as an alias of the catalogue", () => {
    expect(ACADEMY_COURSES_ALIAS_PATH).toBe("/academy/courses");
  });

  it.each(["/academy/courses", "/academy/courses/"])("redirects %s to the catalogue", (path) => {
    renderAcademyRoutes(path);
    expect(screen.getByText("catalogue /academy")).toBeInTheDocument();
  });

  it("still routes real course and lesson slugs", () => {
    renderAcademyRoutes("/academy/fundamentals-core");
    expect(screen.getByText("course /academy/fundamentals-core")).toBeInTheDocument();
  });

  it("still routes lesson slugs", () => {
    renderAcademyRoutes("/academy/fundamentals-core/intro");
    expect(screen.getByText("lesson /academy/fundamentals-core/intro")).toBeInTheDocument();
  });
});
