import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Training from "./Training";
import { FUNDAMENTALS_CORE_GUMROAD_URL } from "@/lib/trainingInterest";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
  it("sends every Buy the Solo Bundle and Buy a Team pack CTA to the live Gumroad product", () => {
    renderTraining();

    const buyLinks = screen.getAllByRole("link", { name: /buy the solo bundle|buy a team pack/i });
    expect(buyLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of buyLinks) {
      expect(link).toHaveAttribute("href", FUNDAMENTALS_CORE_GUMROAD_URL);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("does not link to unpublished Gumroad products and shows Solo Bundle pricing", () => {
    renderTraining();

    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toMatch(/feynmd|sycdc/);
    }

    expect(screen.getAllByText(/€29/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/€39/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/€349/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/€599/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/25\+/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/€399/)).not.toBeInTheDocument();
    expect(screen.queryByText(/€499/)).not.toBeInTheDocument();
    expect(screen.queryByText(/€699/)).not.toBeInTheDocument();
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

  it("keeps the hero Solo Bundle CTA and €29 teaser as the primary self-paced offer", () => {
    renderTraining();

    expect(screen.getByText(/solo bundle/i, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/at launch \(until 31 oct, then €39\)/i)).toBeInTheDocument();
    expect(screen.getAllByText("€29").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/replaces fundamentals core/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/instead of core/i)).not.toBeInTheDocument();
  });

  it("opens the seat-quote dialog variant from Request a quote in the Team packs card", () => {
    renderTraining();

    fireEvent.click(screen.getByRole("button", { name: /^request a quote$/i }));

    const dialog = screen.getByRole("dialog");
    expect(
      screen.getByRole("heading", { name: /request a 25\+ seat quote/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /request a private team workshop/i })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/notes/i)).toHaveValue("");
    expect(within(dialog).getByLabelText(/^seats/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/headcount/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/delivery/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Interest")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/€399/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Fundamentals Core/i)).not.toBeInTheDocument();
  });

  it("lists completion certificates as included with Team packs, not as a later product", () => {
    renderTraining();

    expect(
      screen.getByRole("heading", { name: /completion certificates/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/included with team 5 and team 10/i)).toBeInTheDocument();
    expect(screen.queryByText(/not live/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/self-paced → private workshop → certifications/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/certification/i)).not.toBeInTheDocument();
  });
});
