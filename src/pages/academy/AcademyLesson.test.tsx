import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { createAcademyKitSignedUrl, handleBuyCourse, useAcademyLesson, useAuth } = vi.hoisted(() => ({
  createAcademyKitSignedUrl: vi.fn(() => new Promise<string>(() => {})),
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
    createAcademyKitSignedUrl,
    handleBuyCourse,
  };
});

import AcademyLesson from "./AcademyLesson";
import {
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_KIT_BUY_NOTE,
  ACADEMY_KIT_DOWNLOAD_LABEL,
  ACADEMY_KIT_PENDING_NOTE,
  ACADEMY_SOLO_BUY_LABEL,
  ACADEMY_SOLO_INCLUDED,
  ACADEMY_SOLO_LOCKED_HEADING,
  ACADEMY_SOLO_LOCKED_SIGN_IN_LINK,
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
  it("shows a signed-out visitor on a locked lesson the locked Solo CTA instead of sending them to login", () => {
    handleBuyCourse.mockClear();
    useAuth.mockReturnValue({ user: null } as never);
    useAcademyLesson.mockReturnValue({
      course,
      lesson: paidLesson,
      lessons: [previewLesson, paidLesson],
      bodyMd: null,
      assets: [],
      kitAssets: [],
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

    try {
      renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

      // Stays on the lesson: title, locked heading, one Buy and a Sign in link back to this lesson.
      expect(screen.queryByText(/^login\?/)).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: paidLesson.title })).toBeInTheDocument();
      const cta = screen.getByTestId("academy-solo-cta");
      expect(within(cta).getByText(ACADEMY_SOLO_LOCKED_HEADING)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).toHaveLength(1);
      expect(within(cta).getByRole("link", { name: ACADEMY_SOLO_LOCKED_SIGN_IN_LINK })).toHaveAttribute(
        "href",
        "/login?redirect=%2Facademy%2Felsa-3-solo-bundle%2Fhost-elsa-in-aspnet-core",
      );
      expect(screen.queryByTestId("academy-kit-downloads")).not.toBeInTheDocument();

      // Buy signs them in first (and back to this lesson) rather than starting checkout.
      fireEvent.click(within(cta).getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
      expect(handleBuyCourse).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          "login?redirect=%2Facademy%2Felsa-3-solo-bundle%2Fhost-elsa-in-aspnet-core",
        ),
      ).toBeInTheDocument();
    } finally {
      useAuth.mockReturnValue({ user: { id: "user-1" } });
    }
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

    useAuth.mockReturnValue({ user: null } as never);
    try {
      renderLesson("/academy/elsa-3-solo-bundle/welcome");
    } finally {
      useAuth.mockReturnValue({ user: { id: "user-1" } });
    }

    expect(screen.queryByText(/^login\?/)).not.toBeInTheDocument();
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

  describe("kit step", () => {
    const kitSentence =
      "**Download:** get `elsa-fundamentals-workshop-kit.zip` from the lab kit download on this course page (workshop host, Studio, labs).";
    const kitAssets = [
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
    ];
    const base = {
      course,
      assets: [],
      authLoading: false,
      notFound: false,
      isLoading: false,
      isError: false,
      error: null,
    };

    it("shows Download the kit right after the kit sentence for an entitled user", () => {
      useAcademyLesson.mockReturnValue({
        ...base,
        lesson: paidLesson,
        bodyMd: `Intro paragraph.\n\n${kitSentence}\n\n## After download\n\nUnzip it.`,
        kitAssets,
        hasAccess: true,
        isPreview: false,
        canRead: true,
        user: { id: "user-1" },
      });

      renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

      const body = screen.getByTestId("academy-lesson-body");
      const step = within(body).getByTestId("academy-kit-step");
      const sentence = within(body).getByText(/from the lab kit download on this course page/);
      expect(sentence.closest("p")?.nextElementSibling).toContainElement(step);
      expect(screen.getAllByTestId("academy-kit-step")).toHaveLength(1);
      const download = within(step).getByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL });
      expect(within(step).queryByText("Course lessons, offline copy (Core)")).not.toBeInTheDocument();
      expect(screen.queryByText(ACADEMY_KIT_BUY_NOTE)).not.toBeInTheDocument();
      fireEvent.click(download);
      expect(createAcademyKitSignedUrl).toHaveBeenCalledWith(
        "kits/solo-bundle-20261013/elsa-fundamentals-workshop-kit.zip",
      );
    });

    it("shows the buy note with Buy on a free preview lesson for a signed-in user without access", () => {
      handleBuyCourse.mockClear();
      useAcademyLesson.mockReturnValue({
        ...base,
        lesson: previewLesson,
        bodyMd:
          "1. Download and unzip the kit (`elsa-fundamentals-workshop-kit.zip` from the lab kit download on this course page) and open the root **README**.\n2. Run the host.",
        kitAssets: [],
        hasAccess: false,
        isPreview: true,
        canRead: true,
        user: { id: "user-1" },
      });

      renderLesson("/academy/elsa-3-solo-bundle/welcome");

      const step = screen.getByTestId("academy-kit-step");
      expect(step.closest("li")).toHaveTextContent("Download and unzip the kit");
      expect(within(step).getByText(ACADEMY_KIT_BUY_NOTE)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).not.toBeInTheDocument();
      const buy = within(step).getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL });
      fireEvent.click(buy);
      fireEvent.click(buy);
      expect(handleBuyCourse).toHaveBeenCalledTimes(1);
      expect(handleBuyCourse).toHaveBeenCalledWith("course-1");
    });

    it("shows the buy note on a free preview lesson for a signed-out visitor, and Buy goes to sign in", () => {
      handleBuyCourse.mockClear();
      useAcademyLesson.mockReturnValue({
        ...base,
        lesson: previewLesson,
        bodyMd: `Get the workshop kit running locally.\n\n${kitSentence}`,
        kitAssets: [],
        hasAccess: false,
        isPreview: true,
        canRead: true,
        user: null,
      });
      useAuth.mockReturnValue({ user: null } as never);

      renderLesson("/academy/elsa-3-solo-bundle/welcome");

      const step = screen.getByTestId("academy-kit-step");
      expect(within(step).getByText(ACADEMY_KIT_BUY_NOTE)).toBeInTheDocument();
      fireEvent.click(within(step).getByRole("button", { name: ACADEMY_SOLO_BUY_LABEL }));
      expect(handleBuyCourse).not.toHaveBeenCalled();
      expect(
        screen.getByText("login?redirect=%2Facademy%2Felsa-3-solo-bundle%2Fwelcome"),
      ).toBeInTheDocument();
      useAuth.mockReturnValue({ user: { id: "user-1" } });
    });

    it("keeps the kit step inside the lesson nav frame, with the outline and Next", () => {
      useAcademyLesson.mockReturnValue({
        ...base,
        lesson: previewLesson,
        lessons: [previewLesson, paidLesson],
        bodyMd: `Get the workshop kit running locally.\n\n${kitSentence}`,
        kitAssets: [],
        hasAccess: false,
        isPreview: true,
        canRead: true,
        user: { id: "user-1" },
      });

      renderLesson("/academy/elsa-3-solo-bundle/welcome?payment=success");

      expect(screen.getByText("Lesson 1 of 2")).toBeInTheDocument();
      expect(screen.getAllByTestId("academy-outline-lesson")).toHaveLength(2);
      expect(screen.getByTestId("academy-nav-next")).toHaveTextContent(paidLesson.title);
      expect(screen.getByRole("link", { name: "Back to course" })).toHaveAttribute(
        "href",
        "/academy/elsa-3-solo-bundle",
      );
      const step = screen.getByTestId("academy-kit-step");
      expect(within(step).getByTestId("academy-kit-pending")).toHaveTextContent(ACADEMY_KIT_PENDING_NOTE);
      expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
    });

    it("hides the kit step Buy on payment=success before access is granted", () => {
      handleBuyCourse.mockClear();
      useAcademyLesson.mockReturnValue({
        ...base,
        lesson: previewLesson,
        bodyMd: `Get the workshop kit running locally.\n\n${kitSentence}`,
        kitAssets: [],
        hasAccess: false,
        isPreview: true,
        canRead: true,
        user: { id: "user-1" },
      });

      renderLesson("/academy/elsa-3-solo-bundle/welcome?payment=success");

      const step = screen.getByTestId("academy-kit-step");
      expect(within(step).getByTestId("academy-kit-pending")).toHaveTextContent(ACADEMY_KIT_PENDING_NOTE);
      expect(screen.queryByRole("button", { name: ACADEMY_SOLO_BUY_LABEL })).not.toBeInTheDocument();
      expect(screen.queryByText(ACADEMY_KIT_BUY_NOTE)).not.toBeInTheDocument();
      expect(handleBuyCourse).not.toHaveBeenCalled();
    });

    it("shows no kit step in a lesson without the kit sentence", () => {
      useAcademyLesson.mockReturnValue({
        ...base,
        lesson: paidLesson,
        bodyMd:
          "| **Kit** | Host `:5000` |\n|---|---|\n\nFollow kit `labs/LabA/README.md`.\n\n- Kit downloaded and unzipped\n\n```bash\nunzip elsa-fundamentals-workshop-kit.zip\n```",
        kitAssets,
        hasAccess: true,
        isPreview: false,
        canRead: true,
        user: { id: "user-1" },
      });

      renderLesson("/academy/elsa-3-solo-bundle/host-elsa-in-aspnet-core");

      expect(screen.getByText(/Follow kit/)).toBeInTheDocument();
      expect(screen.queryByTestId("academy-kit-step")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: ACADEMY_KIT_DOWNLOAD_LABEL })).not.toBeInTheDocument();
    });
  });
});
