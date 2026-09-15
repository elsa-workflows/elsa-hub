import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Training from "./Training";
import { FUNDAMENTALS_CORE_GUMROAD_URL } from "@/lib/trainingInterest";

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
    expect(screen.queryByText(/self-paced advanced/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/€2,400|€2,800/)).not.toBeInTheDocument();
  });
});
