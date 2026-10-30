import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { handleBuyCourse, useAcademyLesson, useAuth } = vi.hoisted(() => ({
  handleBuyCourse: vi.fn(),
  useAcademyLesson: vi.fn(),
  useAuth: vi.fn(() => ({ user: { id: "user-1" } })),
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: (props: { noIndex?: boolean; title?: string }) => (
    <div data-testid="seo" data-noindex={props.noIndex ? "true" : "false"}>
      {props.title}
    </div>
  ),
}));

vi.mock("@/hooks/useAcademyLesson", () => ({
  useAcademyLesson: () => useAcademyLesson(),
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

import AcademyLesson from "./AcademyLesson";
import {
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
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

const previewLesson = {
  id: "lesson-preview",
  course_id: "course-1",
  slug: "welcome",
  title: "Welcome and how this course works",
  sort_order: 1,
  is_preview: true,
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

function renderLesson(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/academy/:courseSlug/:lessonSlug" element={<AcademyLesson />} />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Academy lesson page", () => {
  it("sends an anonymous visitor on a paid lesson to login with a return path", () => {
    useAcademyLesson.mockReturnValue({
      course,
      lesson: paidLesson,
      bodyMd: null,
      assets: [],
      hasAccess: false,
      isPreview: false,
      canRead: false,
      authLoading: false,
      user: null,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

    expect(
      screen.getByText(
        "login?redirect=%2Facademy%2Felsa-3-solo-bundle%2Fhost-elsa-in-aspnet-core",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("academy-solo-cta")).not.toBeInTheDocument();
  });

  it("renders a preview lesson body for an anonymous visitor", () => {
    useAcademyLesson.mockReturnValue({
      course,
      lesson: previewLesson,
      bodyMd: "This preview lesson is free.",
      assets: [],
      hasAccess: false,
      isPreview: true,
      canRead: true,
      authLoading: false,
      user: null,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderLesson("/academy/elsa-3-solo-bundle/welcome");

    expect(screen.getByRole("heading", { name: previewLesson.title })).toBeInTheDocument();
    expect(screen.getByText("This preview lesson is free.")).toBeInTheDocument();
    expect(screen.queryByTestId("academy-solo-cta")).not.toBeInTheDocument();
    expect(screen.getByTestId("seo")).toHaveAttribute("data-noindex", "true");
  });

  it("renders the Solo CTA on a locked lesson for a signed-in unentitled user", () => {
    useAcademyLesson.mockReturnValue({
      course,
      lesson: paidLesson,
      bodyMd: null,
      assets: [],
      hasAccess: false,
      isPreview: false,
      canRead: false,
      authLoading: false,
      user: { id: "user-1" },
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

    expect(screen.getByRole("heading", { name: paidLesson.title })).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).toBeInTheDocument();
    expect(screen.getByTestId("academy-solo-cta")).not.toHaveAttribute("id", "solo-bundle");
    expect(screen.getByRole("heading", { name: ACADEMY_SOLO_LOCKED_HEADING })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_INCLUDED[0])).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_GUMROAD_CLAIM_LINE)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Training page" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
    expect(handleBuyCourse).toHaveBeenCalledTimes(1);
    expect(handleBuyCourse).toHaveBeenCalledWith("course-1");
    expect(screen.queryByText("Host Elsa 3.9.0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("academy-kit-downloads")).not.toBeInTheDocument();
  });

  it("renders markdown and kit downloads for an entitled user", () => {
    useAcademyLesson.mockReturnValue({
      course,
      lesson: paidLesson,
      bodyMd: "# Body heading\n\nHost Elsa 3.9.0 in an ASP.NET Core app.",
      assets: [
        {
          id: "asset-1",
          course_id: "course-1",
          lesson_id: "lesson-paid",
          label: "Hosting lab kit",
          storage_path: "solo/kit.zip",
        },
      ],
      hasAccess: true,
      isPreview: false,
      canRead: true,
      authLoading: false,
      user: { id: "user-1" },
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

    expect(screen.getByRole("heading", { level: 1, name: paidLesson.title })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Host Elsa 3.9.0 in an ASP.NET Core app.")).toBeInTheDocument();
    expect(screen.getByTestId("academy-kit-downloads")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hosting lab kit" })).toBeInTheDocument();
    expect(screen.queryByTestId("academy-solo-cta")).not.toBeInTheDocument();
  });

  it("shows an empty state, not the buy panel, when an entitled user's lesson has no body", () => {
    useAcademyLesson.mockReturnValue({
      course,
      lesson: paidLesson,
      bodyMd: null,
      assets: [],
      hasAccess: true,
      isPreview: false,
      canRead: true,
      authLoading: false,
      user: { id: "user-1" },
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

    expect(screen.getByRole("heading", { name: "No content yet" })).toBeInTheDocument();
    expect(screen.queryByTestId("academy-solo-cta")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
  });

  it("shows an empty state, not the buy panel, when a preview lesson has no body", () => {
    useAcademyLesson.mockReturnValue({
      course,
      lesson: previewLesson,
      bodyMd: "",
      assets: [],
      hasAccess: false,
      isPreview: true,
      canRead: true,
      authLoading: false,
      user: null,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderLesson("/academy/elsa-3-solo-bundle/welcome");

    expect(screen.getByRole("heading", { name: "No content yet" })).toBeInTheDocument();
    expect(screen.queryByTestId("academy-solo-cta")).not.toBeInTheDocument();
  });
});
