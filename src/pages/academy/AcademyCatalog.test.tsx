import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { handleBuyCourse, useAcademyCatalog } = vi.hoisted(() => ({
  handleBuyCourse: vi.fn(),
  useAcademyCatalog: vi.fn(),
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

vi.mock("@/hooks/useAcademyCatalog", () => ({
  useAcademyCatalog: () => useAcademyCatalog(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return {
    ...actual,
    handleBuyCourse,
  };
});

import AcademyCatalog from "./AcademyCatalog";
import { ACADEMY_TEAM_LICENCES_URL } from "@/lib/academy";

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

function catalogTree(path = "/academy") {
  return (
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <AcademyCatalog />
      </MemoryRouter>
    </HelmetProvider>
  );
}

function renderCatalog(path = "/academy") {
  return render(catalogTree(path));
}

function loadedCatalog() {
  return {
    courses: [course],
    myCourses: [],
    accessByCourseId: {},
    isLoading: false,
    isError: false,
    error: null,
  };
}

describe("Academy catalog", () => {
  it("shows the Solo Bundle panel and catalogue cards without a per-course Buy button", () => {
    useAcademyCatalog.mockReturnValue(loadedCatalog());

    renderCatalog();

    expect(screen.getByRole("heading", { name: "Academy" })).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).toHaveAttribute("id", "solo-bundle");
    expect(screen.getByRole("heading", { name: "Solo Bundle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team licences" })).toHaveAttribute(
      "href",
      ACADEMY_TEAM_LICENCES_URL,
    );
    expect(screen.getByRole("heading", { name: course.title })).toBeInTheDocument();
    expect(screen.getByText(course.summary)).toBeInTheDocument();
    expect(screen.getByText("€29.00")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByText("My courses")).not.toBeInTheDocument();
  });

  it("shows Continue and My courses for an entitled user", () => {
    useAcademyCatalog.mockReturnValue({
      courses: [course],
      myCourses: [course],
      accessByCourseId: { [course.id]: true },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCatalog();

    expect(screen.getByRole("heading", { name: "My courses" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /continue/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("academy-solo-cta")).toBeInTheDocument();
  });

  it("scrolls to #solo-bundle after the catalogue loads", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      useAcademyCatalog.mockReturnValue({
        courses: [],
        myCourses: [],
        accessByCourseId: {},
        isLoading: true,
        isError: false,
        error: null,
      });

      const { rerender } = renderCatalog("/academy#solo-bundle");
      expect(screen.getByTestId("academy-solo-cta")).toHaveAttribute("id", "solo-bundle");
      expect(scrollIntoView).toHaveBeenCalled();

      scrollIntoView.mockClear();
      useAcademyCatalog.mockReturnValue(loadedCatalog());
      rerender(catalogTree("/academy#solo-bundle"));
      expect(scrollIntoView).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("calls handleBuyCourse from the Solo Bundle Buy CTA", () => {
    useAcademyCatalog.mockReturnValue(loadedCatalog());

    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    expect(handleBuyCourse).toHaveBeenCalledTimes(1);
  });

  it("renders empty and error states", () => {
    useAcademyCatalog.mockReturnValue({
      courses: [],
      myCourses: [],
      accessByCourseId: {},
      isLoading: false,
      isError: false,
      error: null,
    });
    const { unmount } = renderCatalog();
    expect(screen.getByText("Courses are coming soon.")).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).toHaveAttribute("id", "solo-bundle");
    unmount();

    useAcademyCatalog.mockReturnValue({
      courses: [],
      myCourses: [],
      accessByCourseId: {},
      isLoading: false,
      isError: true,
      error: new Error("catalogue down"),
    });
    renderCatalog();
    expect(screen.getByText("catalogue down")).toBeInTheDocument();
  });
});
