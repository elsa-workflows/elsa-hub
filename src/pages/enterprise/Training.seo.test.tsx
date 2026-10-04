import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Training from "./Training";
import {
  TRAINING_DESCRIPTION,
  TRAINING_H1,
  TRAINING_TITLE,
  buildTrainingHead,
} from "@/lib/trainingSeo";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: async () => ({ error: null }),
    }),
    functions: {
      invoke: async () => ({ data: { success: true }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: null }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({ organizations: [] }),
}));

function renderTraining() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Training />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Training page SEO", () => {
  afterEach(() => {
    document
      .querySelectorAll(
        "link[rel='canonical'], meta[name='description'], meta[property^='og:'], meta[name^='twitter:'], script[type='application/ld+json']",
      )
      .forEach((node) => node.remove());
  });

  it("sets Seo title, description, Course JSON-LD, and a single H1", async () => {
    renderTraining();

    await waitFor(() => {
      expect(document.title).toBe(TRAINING_TITLE);
    });
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      TRAINING_DESCRIPTION,
    );
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://www.elsaworkflows.io/elsa-plus/training",
    );
    expect(document.querySelector("meta[property='og:title']")?.getAttribute("content")).toBe(
      TRAINING_TITLE,
    );
    expect(document.querySelector("meta[name='twitter:title']")?.getAttribute("content")).toBe(
      TRAINING_TITLE,
    );
    expect(document.querySelector("meta[name='twitter:card']")?.getAttribute("content")).toBe(
      "summary_large_image",
    );
    expect(document.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
      "https://www.elsaworkflows.io/og-training.png",
    );

    const scripts = [...document.querySelectorAll("script[type='application/ld+json']")];
    const course = scripts
      .map((node) => JSON.parse(node.textContent || "{}") as Record<string, unknown>)
      .find((ld) => ld["@type"] === "Course");
    expect(course).toBeTruthy();
    expect(course?.name).toBe(TRAINING_H1);
    expect(JSON.stringify(course)).not.toMatch(/courseWorkload/);
    const offers = course?.offers as { price?: string; priceValidUntil?: string; validFrom?: string }[];
    expect(offers).toHaveLength(2);
    expect(offers[0].price).toBe("29");
    expect(offers[0].priceValidUntil).toBe("2026-10-31");
    expect(offers[1].price).toBe("39");
    expect(offers[1].validFrom).toBe("2026-11-01");
    expect(course?.inLanguage).toBe("en");

    const headings = document.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(TRAINING_H1);
  });

  it("replaces prerendered and index.html head tags so each appears once after hydration", async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      [
        `<meta data-rh="true" name="description" content="Build workflow-driven .NET apps with Elsa: visual designer, C# code, and scale from small apps to enterprise systems. Open source." />`,
        `<meta data-rh="true" property="og:title" content="The Workflow Engine for .NET" />`,
        `<meta data-rh="true" property="og:description" content="Build workflow-driven .NET apps with Elsa: visual designer, C# code, and scale from small apps to enterprise systems. Open source." />`,
        `<meta data-rh="true" property="og:type" content="website" />`,
        `<meta data-rh="true" property="og:url" content="https://www.elsaworkflows.io/" />`,
        `<meta data-rh="true" property="og:image" content="https://www.elsaworkflows.io/og-default.png" />`,
        `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
        `<meta data-rh="true" name="twitter:title" content="The Workflow Engine for .NET" />`,
        `<meta data-rh="true" name="twitter:description" content="Build workflow-driven .NET apps with Elsa: visual designer, C# code, and scale from small apps to enterprise systems. Open source." />`,
        `<meta data-rh="true" name="twitter:image" content="https://www.elsaworkflows.io/og-default.png" />`,
        buildTrainingHead(),
      ].join("\n"),
    );

    renderTraining();

    await waitFor(() => {
      expect(document.title).toBe(TRAINING_TITLE);
    });

    const courseScripts = [...document.querySelectorAll("script[type='application/ld+json']")].filter(
      (node) => {
        try {
          return (JSON.parse(node.textContent || "{}") as { "@type"?: string })["@type"] === "Course";
        } catch {
          return false;
        }
      },
    );

    const counts = {
      canonical: document.querySelectorAll("link[rel='canonical']").length,
      description: document.querySelectorAll("meta[name='description']").length,
      "og:title": document.querySelectorAll("meta[property='og:title']").length,
      "og:description": document.querySelectorAll("meta[property='og:description']").length,
      "og:url": document.querySelectorAll("meta[property='og:url']").length,
      "og:type": document.querySelectorAll("meta[property='og:type']").length,
      "og:image": document.querySelectorAll("meta[property='og:image']").length,
      "og:site_name": document.querySelectorAll("meta[property='og:site_name']").length,
      "twitter:card": document.querySelectorAll("meta[name='twitter:card']").length,
      "twitter:title": document.querySelectorAll("meta[name='twitter:title']").length,
      "twitter:description": document.querySelectorAll("meta[name='twitter:description']").length,
      "twitter:image": document.querySelectorAll("meta[name='twitter:image']").length,
      "Course JSON-LD": courseScripts.length,
    };

    expect(counts).toEqual({
      canonical: 1,
      description: 1,
      "og:title": 1,
      "og:description": 1,
      "og:url": 1,
      "og:type": 1,
      "og:image": 1,
      "og:site_name": 1,
      "twitter:card": 1,
      "twitter:title": 1,
      "twitter:description": 1,
      "twitter:image": 1,
      "Course JSON-LD": 1,
    });
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://www.elsaworkflows.io/elsa-plus/training",
    );
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      TRAINING_DESCRIPTION,
    );
  });
});
