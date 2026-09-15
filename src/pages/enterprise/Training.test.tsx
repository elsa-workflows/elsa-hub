import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Training from "./Training";
import {
  ADVANCED_PATTERNS_GUMROAD_URL,
  FUNDAMENTALS_COMPLETE_GUMROAD_URL,
  FUNDAMENTALS_CORE_GUMROAD_URL,
} from "@/lib/trainingInterest";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: unknown }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
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
    <MemoryRouter>
      <Training />
    </MemoryRouter>,
  );
}

describe("Training page", () => {
  it("sends every Get Fundamentals Core CTA to the live Gumroad product", () => {
    renderTraining();

    const coreLinks = screen.getAllByRole("link", { name: /get fundamentals core/i });
    expect(coreLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of coreLinks) {
      expect(link).toHaveAttribute("href", FUNDAMENTALS_CORE_GUMROAD_URL);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("keeps the private workshop CTA on the interest dialog", () => {
    renderTraining();

    fireEvent.click(screen.getAllByRole("button", { name: /request a private team workshop/i })[0]);

    expect(
      screen.getByRole("heading", { name: /request a private team workshop/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeInTheDocument();
  });

  it("mentions Approval Lite only as a private workshop module", () => {
    renderTraining();

    expect(
      screen.getByRole("heading", {
        name: /module available for private teams: approval lite/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/half-day facilitator-led architecture case/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/note "approval lite" in your message/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fundamentals and\/or the approval lite module/i),
    ).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /approval lite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /approval lite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /buy approval lite/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/€2,400|€2,800/)).not.toBeInTheDocument();
  });

  it("sends Get Advanced Patterns to the Advanced Gumroad product, not Core", () => {
    renderTraining();

    const links = screen.getAllByRole("link", { name: /get advanced patterns/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", ADVANCED_PATTERNS_GUMROAD_URL);
      expect(link).not.toHaveAttribute("href", FUNDAMENTALS_CORE_GUMROAD_URL);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    expect(screen.getByRole("heading", { name: /advanced patterns v1\.0/i })).toBeInTheDocument();
    expect(screen.getAllByText(/from €499/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ap0–ap2/i).length).toBeGreaterThanOrEqual(1);
  });

  it("sends Get Fundamentals Complete to the Complete Gumroad product, not Core", () => {
    renderTraining();

    const links = screen.getAllByRole("link", { name: /get fundamentals complete/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", FUNDAMENTALS_COMPLETE_GUMROAD_URL);
      expect(link).not.toHaveAttribute("href", FUNDAMENTALS_CORE_GUMROAD_URL);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    expect(screen.getByRole("heading", { name: /fundamentals complete/i })).toBeInTheDocument();
    expect(screen.getAllByText(/from €699/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/modules 0–10 \+ labs a–h/i).length).toBeGreaterThanOrEqual(1);
  });

  it("keeps the hero Core CTA and €399 teaser as the primary self-paced offer", () => {
    renderTraining();

    expect(screen.getByText(/self-paced core from/i)).toBeInTheDocument();
    expect(screen.getAllByText("€399").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/replaces fundamentals core/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/instead of core/i)).not.toBeInTheDocument();
  });
});
