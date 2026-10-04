import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Training from "./Training";
import { TRAINING_DESCRIPTION, TRAINING_H1, TRAINING_TITLE } from "@/lib/trainingSeo";

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
    expect((course?.offers as { price?: string }).price).toBe("29");
    expect((course?.offers as { priceValidUntil?: string }).priceValidUntil).toBe("2026-10-31");

    const headings = document.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(TRAINING_H1);
  });
});
