import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcademyCatalog from "./AcademyCatalog";
import AcademyCourse from "./AcademyCourse";
import AcademyLesson from "./AcademyLesson";
import { ACADEMY_DESCRIPTION, ACADEMY_TITLE } from "@/lib/academySeo";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useAcademyCatalog", () => ({
  useAcademyCatalog: () => ({
    courses: [],
    myCourses: [],
    accessByCourseId: {},
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useAcademyCourse", () => ({
  useAcademyCourse: () => ({
    course: {
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
    },
    lessons: [],
    kitAssets: [],
    hasAccess: false,
    notFound: false,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useAcademyLesson", () => ({
  useAcademyLesson: () => ({
    course: {
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
    },
    lesson: {
      id: "lesson-preview",
      course_id: "course-1",
      slug: "welcome",
      title: "Welcome and how this course works",
      sort_order: 1,
      is_preview: true,
    },
    bodyMd: "Preview body",
    assets: [],
    hasAccess: false,
    isPreview: true,
    canRead: true,
    notFound: false,
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

function renderAt(path: string, ui: ReactNode) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/academy" element={ui} />
          <Route path="/academy/:courseSlug" element={ui} />
          <Route path="/academy/:courseSlug/:lessonSlug" element={ui} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Academy SEO", () => {
  afterEach(() => {
    document
      .querySelectorAll(
        "link[rel='canonical'], meta[name='description'], meta[name='robots'], meta[property^='og:'], meta[name^='twitter:']",
      )
      .forEach((node) => node.remove());
  });

  it("makes the catalogue crawlable with the existing Seo title pattern", async () => {
    renderAt("/academy", <AcademyCatalog />);

    await waitFor(() => {
      expect(document.title).toBe(ACADEMY_TITLE);
    });
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      ACADEMY_DESCRIPTION,
    );
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://www.elsaworkflows.io/academy",
    );
    expect(document.querySelector("meta[name='robots']")).toBeNull();
  });

  it("makes course pages crawlable", async () => {
    renderAt("/academy/elsa-3-solo-bundle", <AcademyCourse />);

    await waitFor(() => {
      expect(document.title).toBe("Elsa 3 Solo Bundle | Elsa Academy");
    });
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://www.elsaworkflows.io/academy/elsa-3-solo-bundle",
    );
    expect(document.querySelector("meta[name='robots']")).toBeNull();
  });

  it("marks lesson pages noindex", async () => {
    renderAt("/academy/elsa-3-solo-bundle/welcome", <AcademyLesson />);

    await waitFor(() => {
      expect(document.title).toBe("Welcome and how this course works | Elsa 3 Solo Bundle");
    });
    expect(document.querySelector("meta[name='robots']")?.getAttribute("content")).toBe(
      "noindex,nofollow",
    );
  });
});
