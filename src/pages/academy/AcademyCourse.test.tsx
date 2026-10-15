import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { useAcademyCourse } = vi.hoisted(() => ({
  useAcademyCourse: vi.fn(),
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

vi.mock("@/hooks/useAcademyCourse", () => ({
  useAcademyCourse: () => useAcademyCourse(),
}));

import AcademyCourse from "./AcademyCourse";

const course = {
  id: "course-1",
  slug: "elsa-3-solo-bundle",
  title: "Elsa 3 Solo Bundle",
  summary: "Self-paced Elsa 3 course and lab kit.",
  sort_order: 1,
  is_published: true,
  price_cents: 2900,
  currency: "eur",
  stripe_price_id: null,
  product_code: "solo_bundle",
};

const lessons = [
  {
    id: "lesson-preview",
    course_id: "course-1",
    slug: "welcome",
    title: "Welcome and how this course works",
    sort_order: 1,
    is_preview: true,
  },
  {
    id: "lesson-paid",
    course_id: "course-1",
    slug: "host-elsa-in-aspnet-core",
    title: "Host Elsa in ASP.NET Core",
    sort_order: 2,
    is_preview: false,
  },
];

function renderCourse() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/academy/elsa-3-solo-bundle"]}>
        <Routes>
          <Route path="/academy/:courseSlug" element={<AcademyCourse />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Academy course page", () => {
  it("lists preview lessons as open and paid lessons as locked when the visitor is not entitled", () => {
    useAcademyCourse.mockReturnValue({
      course,
      lessons,
      kitAssets: [],
      hasAccess: false,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCourse();

    expect(screen.getByRole("heading", { name: course.title })).toBeInTheDocument();
    expect(screen.getByText("Welcome and how this course works")).toBeInTheDocument();
    expect(screen.getByText("Host Elsa in ASP.NET Core")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).not.toHaveAttribute("id", "solo-bundle");
    expect(screen.getByRole("heading", { name: "Solo Bundle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buy" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Unlocked")).not.toBeInTheDocument();
  });

  it("unlocks paid lesson rows for an entitled user", () => {
    useAcademyCourse.mockReturnValue({
      course,
      lessons,
      kitAssets: [
        {
          id: "kit-1",
          course_id: "course-1",
          lesson_id: null,
          label: "Solo Bundle lab kit",
          storage_path: "solo-bundle/kit.zip",
        },
      ],
      hasAccess: true,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCourse();

    expect(screen.getByLabelText("Unlocked")).toBeInTheDocument();
    expect(screen.queryByLabelText("Locked")).not.toBeInTheDocument();
    expect(screen.queryByTestId("academy-solo-cta")).not.toBeInTheDocument();
    expect(screen.getByText("You have access to this course.")).toBeInTheDocument();
    expect(screen.getByTestId("academy-kit-downloads")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Downloads" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solo Bundle lab kit" })).toBeInTheDocument();
  });
});
