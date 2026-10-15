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

function renderCatalog() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AcademyCatalog />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Academy catalog", () => {
  it("shows title, summary, price and Buy for an anonymous visitor", () => {
    useAcademyCatalog.mockReturnValue({
      courses: [course],
      myCourses: [],
      accessByCourseId: {},
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCatalog();

    expect(screen.getByRole("heading", { name: "Academy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: course.title })).toBeInTheDocument();
    expect(screen.getByText(course.summary)).toBeInTheDocument();
    expect(screen.getByText("€29.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Buy" })).not.toBeInTheDocument();
  });

  it("calls handleBuyCourse from the catalog Buy CTA", () => {
    useAcademyCatalog.mockReturnValue({
      courses: [course],
      myCourses: [],
      accessByCourseId: {},
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    expect(handleBuyCourse).toHaveBeenCalledWith(course);
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
    expect(screen.getByText("No courses yet")).toBeInTheDocument();
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
