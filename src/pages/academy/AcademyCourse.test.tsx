import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { useAcademyCourse, useAuth } = vi.hoisted(() => ({
  useAcademyCourse: vi.fn(),
  useAuth: vi.fn(() => ({ user: null })),
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

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuth(),
}));

import AcademyCourse from "./AcademyCourse";
import {
  ACADEMY_KIT_BUY_NOTE,
  ACADEMY_KIT_DOWNLOAD_LABEL,
  ACADEMY_KIT_PENDING_NOTE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
  ACADEMY_SOLO_SIGN_IN_LABEL,
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

function renderCourse(path = "/academy/elsa-3-solo-bundle") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
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
    expect(screen.getByRole("heading", { name: ACADEMY_SOLO_LOCKED_HEADING })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ACADEMY_SOLO_SIGN_IN_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_SOLO_INCLUDED[0])).not.toBeInTheDocument();
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

  it("shows Download the kit near the top of the course page for an entitled user", () => {
    useAcademyCourse.mockReturnValue({
      course,
      lessons,
      kitAssets: [
        {
          id: "offline-core",
          course_id: "course-1",
          lesson_id: null,
          label: "Course lessons, offline copy (Core)",
          storage_path: "courses/elsa-3.9.0/fundamentals-core-self-paced.zip",
        },
        {
          id: "lab-kit",
          course_id: "other-course",
          lesson_id: null,
          label: "Lab kit (Elsa 3.9.0)",
          storage_path: "kits/solo-bundle-20261013/elsa-fundamentals-workshop-kit.zip",
        },
      ],
      hasAccess: true,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCourse();

    const top = screen.getByTestId("academy-kit-step-top");
    expect(top.closest("header")).toContainElement(screen.getByRole("heading", { level: 1, name: course.title }));
    expect(within(top).getByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).toBeInTheDocument();
    expect(within(top).queryByText("Course lessons, offline copy (Core)")).not.toBeInTheDocument();
    // Downloads lower down lists the other files, not the lab kit a second time.
    const downloads = screen.getByTestId("academy-kit-downloads");
    expect(within(downloads).getByRole("button", { name: "Course lessons, offline copy (Core)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lab kit (Elsa 3.9.0)" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).toHaveLength(1);
    expect(screen.queryByText(ACADEMY_KIT_BUY_NOTE)).not.toBeInTheDocument();
  });

  it("hides Downloads when the lab kit is the only course download", () => {
    useAcademyCourse.mockReturnValue({
      course,
      lessons,
      kitAssets: [
        {
          id: "lab-kit",
          course_id: "other-course",
          lesson_id: null,
          label: "Lab kit (Elsa 3.9.0)",
          storage_path: "kits/solo-bundle-20261013/elsa-fundamentals-workshop-kit.zip",
        },
      ],
      hasAccess: true,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderCourse();

    expect(screen.getByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).toBeInTheDocument();
    expect(screen.queryByTestId("academy-kit-downloads")).not.toBeInTheDocument();
  });

  it("shows the buy note with Buy near the top of the course page without access", () => {
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

    const top = screen.getByTestId("academy-kit-step-top");
    expect(top.closest("header")).not.toBeNull();
    expect(within(top).getByText(ACADEMY_KIT_BUY_NOTE)).toBeInTheDocument();
    // One checkout on the page: the top Buy links to the Solo CTA lower down.
    const cta = screen.getByTestId("academy-solo-cta");
    expect(within(top).getByRole("link", { name: ACADEMY_SOLO_BUY_LABEL })).toHaveAttribute(
      "href",
      `#${cta.id}`,
    );
    expect(cta.id).not.toBe("");
    expect(within(top).queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).not.toBeInTheDocument();
  });

  it("shows no Buy anywhere on payment=success before the webhook grants access", () => {
    useAuth.mockReturnValue({ user: { id: "user-1" } } as never);
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

    renderCourse("/academy/elsa-3-solo-bundle?payment=success");

    const top = screen.getByTestId("academy-kit-step-top");
    expect(within(top).getByTestId("academy-kit-pending")).toHaveTextContent(ACADEMY_KIT_PENDING_NOTE);
    expect(screen.getByTestId("academy-payment-pending")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(ACADEMY_KIT_BUY_NOTE)).not.toBeInTheDocument();
    useAuth.mockReturnValue({ user: null });
  });
});
