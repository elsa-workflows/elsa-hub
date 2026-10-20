import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { handleBuyCourse, useAcademyCatalog, useAuth } = vi.hoisted(() => ({
  handleBuyCourse: vi.fn(),
  useAcademyCatalog: vi.fn(),
  useAuth: vi.fn(() => ({ user: null })),
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

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return {
    ...actual,
    handleBuyCourse,
  };
});

import AcademyCatalog from "./AcademyCatalog";
import {
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_OWNED_LINK,
  ACADEMY_SOLO_OWNED_NOTE,
  ACADEMY_SOLO_SIGN_IN_LABEL,
  ACADEMY_SOLO_SIGNED_OUT_NOTE,
  academySoloBundleBody,
} from "@/lib/academyCopy";

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
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null });
  });

  it("shows the Solo Bundle panel and catalogue cards without a per-course Buy button", () => {
    useAcademyCatalog.mockReturnValue(loadedCatalog());

    renderCatalog();

    expect(screen.getByRole("heading", { name: "Academy" })).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).toHaveAttribute("id", "solo-bundle");
    expect(screen.getByRole("heading", { name: "Solo Bundle" })).toBeInTheDocument();
    expect(screen.getByText(academySoloBundleBody())).toBeInTheDocument();
    for (const item of ACADEMY_SOLO_INCLUDED) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).toBeInTheDocument();
    expect(screen.getByText(ACADEMY_SOLO_SIGNED_OUT_NOTE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Training page" })).toHaveAttribute(
      "href",
      "/elsa-plus/training",
    );
    expect(screen.getByRole("heading", { name: course.title })).toBeInTheDocument();
    expect(screen.getByText(course.summary)).toBeInTheDocument();
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
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useAcademyCatalog.mockReturnValue(loadedCatalog());

    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
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

  it("replaces the Buy button with an ownership note when the visitor has access to every published course", () => {
    const second = { ...course, id: "course-2", slug: "advanced", title: "Advanced" };
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useAcademyCatalog.mockReturnValue({
      ...loadedCatalog(),
      courses: [course, second],
      myCourses: [course, second],
      accessByCourseId: { [course.id]: true, [second.id]: true },
    });

    renderCatalog();

    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).not.toBeInTheDocument();
    expect(screen.getByText(ACADEMY_SOLO_OWNED_NOTE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ACADEMY_SOLO_OWNED_LINK })).toHaveAttribute(
      "href",
      "#my-courses",
    );
  });

  it("keeps the Buy button when the visitor has access to only some published courses", () => {
    const second = { ...course, id: "course-2", slug: "advanced", title: "Advanced" };
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useAcademyCatalog.mockReturnValue({
      ...loadedCatalog(),
      courses: [course, second],
      myCourses: [course],
      accessByCourseId: { [course.id]: true, [second.id]: false },
    });

    renderCatalog();

    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  it.each([
    ["is loading", { isLoading: true }],
    ["failed to load", { isError: true, error: new Error("access check failed") }],
  ])("shows neither Buy, sign-in nor the ownership note while ownership %s", (_label, state) => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useAcademyCatalog.mockReturnValue({ ...loadedCatalog(), ...state });

    renderCatalog();

    expect(screen.getByTestId("academy-solo-cta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  it("keeps the Buy button for a signed-in user who owns nothing", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useAcademyCatalog.mockReturnValue(loadedCatalog());

    renderCatalog();

    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });
});
