import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const {
  handleBuyCourse,
  listPersonalAcademyGrants,
  listPublishedCourses,
  mapCourseAccess,
  useAcademyCatalog,
  useAuth,
} = vi.hoisted(() => ({
  handleBuyCourse: vi.fn(),
  listPersonalAcademyGrants: vi.fn(),
  listPublishedCourses: vi.fn(),
  mapCourseAccess: vi.fn(),
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

// What RLS shows a platform admin: every user's entitlements, none of them the admin's own.
const adminVisibleEntitlements = [
  { user_id: "someone-else", subject_type: "user", course_id: null, product_code: "solo_bundle", revoked_at: null },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      let rows: Record<string, unknown>[] = adminVisibleEntitlements;
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        is: (column: string, value: null) => {
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        then: (resolve: (result: unknown) => unknown) => resolve({ data: rows, error: null }),
      };
      return query;
    },
  },
}));

vi.mock("@/lib/academy", async () => {
  const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
  return {
    ...actual,
    handleBuyCourse,
    listPersonalAcademyGrants,
    listPublishedCourses,
    mapCourseAccess,
  };
});

import AcademyCatalog from "./AcademyCatalog";
import {
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_OWNED_LINK,
  ACADEMY_SOLO_OWNED_NOTE,
  ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE,
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
  product_codes: ["solo_bundle"],
};

const second = { ...course, id: "course-2", slug: "advanced", title: "Advanced" };

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
    soloOwnership: "none",
    isLoading: false,
    isError: false,
    error: null,
  };
}

/** Signed-in visitor viewing a loaded catalogue, with the given catalogue fields overridden. */
function arrangeSignedInCatalog(overrides: Record<string, unknown> = {}) {
  useAuth.mockReturnValue({ user: { id: "user-1" } });
  useAcademyCatalog.mockReturnValue({ ...loadedCatalog(), ...overrides });
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
    expect(screen.getByTestId("academy-solo-cta")).toHaveClass("scroll-mt-24");
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
    arrangeSignedInCatalog();

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

  it("replaces the Buy button with an ownership note when the visitor owns the Solo Bundle", () => {
    arrangeSignedInCatalog({
      courses: [course, second],
      myCourses: [course, second],
      accessByCourseId: { [course.id]: true, [second.id]: true },
      soloOwnership: "owned",
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
    arrangeSignedInCatalog({
      courses: [course, second],
      myCourses: [course],
      accessByCourseId: { [course.id]: true, [second.id]: false },
    });

    renderCatalog();

    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  it.each([
    ["is loading", { soloOwnership: "unknown" }],
    ["failed to load", { soloOwnership: "unknown", isError: true, error: new Error("access check failed") }],
  ])("shows neither Buy, sign-in nor the ownership note while ownership %s", (_label, state) => {
    arrangeSignedInCatalog(state);

    renderCatalog();

    expect(screen.getByTestId("academy-solo-cta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });

  it("keeps the Buy button for a signed-in user who owns nothing", () => {
    arrangeSignedInCatalog();

    renderCatalog();

    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });
});

describe("Academy catalog Solo ownership rule", () => {
  const everyCourse = { [course.id]: true, [second.id]: true };

  beforeEach(async () => {
    vi.clearAllMocks();
    const actual = await vi.importActual<typeof import("@/hooks/useAcademyCatalog")>(
      "@/hooks/useAcademyCatalog",
    );
    useAcademyCatalog.mockImplementation(actual.useAcademyCatalog);
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    listPublishedCourses.mockResolvedValue([course, second]);
  });

  function renderWithQueries() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}>{catalogTree()}</QueryClientProvider>);
  }

  async function expectBuy() {
    expect(await screen.findByRole("heading", { name: "My courses" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  }

  it("shows Buy, not the owned note, to a team-seat holder with access to every course", async () => {
    mapCourseAccess.mockResolvedValue(everyCourse);
    listPersonalAcademyGrants.mockResolvedValue([]);

    renderWithQueries();

    await expectBuy();
  });

  it("shows Buy to an admin without personal grants, though RLS shows them others' grants", async () => {
    const actual = await vi.importActual<typeof import("@/lib/academy")>("@/lib/academy");
    mapCourseAccess.mockResolvedValue(everyCourse);
    listPersonalAcademyGrants.mockImplementation(actual.listPersonalAcademyGrants);

    renderWithQueries();

    await expectBuy();
    expect(listPersonalAcademyGrants).toHaveBeenCalledWith("user-1");
  });

  it("shows the owned note to a personal owner", async () => {
    mapCourseAccess.mockResolvedValue(everyCourse);
    listPersonalAcademyGrants.mockResolvedValue([{ course_id: null, product_code: "solo_bundle" }]);

    renderWithQueries();

    expect(await screen.findByText(ACADEMY_SOLO_OWNED_NOTE)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument(),
    );
  });

  it("hides Buy and asks for a refresh when the grants read fails", async () => {
    mapCourseAccess.mockResolvedValue(everyCourse);
    listPersonalAcademyGrants.mockRejectedValue(new Error("grants failed"));

    renderWithQueries();

    expect(await screen.findByText(ACADEMY_SOLO_OWNERSHIP_CHECK_FAILED_LINE)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My courses" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_OWNED_NOTE)).not.toBeInTheDocument();
  });
});
