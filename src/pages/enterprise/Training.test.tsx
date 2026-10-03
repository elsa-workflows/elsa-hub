import { readFileSync } from "node:fs";
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

  it("rewrites the Workshops card for self-paced Approval Lite", () => {
    renderTraining();

    expect(screen.getByRole("heading", { name: /^workshops$/i })).toBeInTheDocument();
    expect(
      screen.getByText(/private team workshops with a facilitator for your whole team\. from/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/€3,200/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", {
        name: /approval lite: self-paced in the solo bundle, or as a private workshop/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/approval lite is part of advanced patterns \(ap0 to ap2\) and is included in the solo bundle and every team pack/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/prefer to learn it live\? we also run approval lite as a half-day facilitated private workshop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/mention "approval lite" in your message/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/private quotes can include fundamentals, approval lite, or both\. tell us which in your message\./i),
    ).toBeInTheDocument();

    expect(screen.queryByText(/private team workshops only/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/module available for private teams/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approval lite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /approval lite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /buy approval lite/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/€2,400|€2,800/)).not.toBeInTheDocument();
  });

  it("shows What you'll learn lists for Core and Advanced Patterns", () => {
    renderTraining();

    expect(screen.getByRole("heading", { name: "What you'll learn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Core" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Advanced Patterns (includes Approval Lite)" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Explain how Elsa 3 works in plain terms: workflow definitions and instances, activity outcomes and outputs, triggers and bookmarks.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Host Elsa 3.8.4 in an ASP.NET Core app with SQLite persistence, the Workflows API, and HTTP workflows.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Build and publish a Flowchart in Elsa Studio with variables, expressions, and a Decision branch, then read the journal to see which branch ran.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Publish an HTTP-triggered workflow that returns JSON, call it with curl, and follow the run in Studio.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Decide when one long-running workflow is enough for a multi-role approval, and where state belongs: workflow variables, bookmarks, or your own database.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Build an approval workflow in Elsa Studio that starts from an HTTP POST, rejects invalid input with a 400, and replies right away with a 202 and the instance ID.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Pause until a manager decision arrives, and handle reject and resubmit on the same instance instead of trying to undo history.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Check every path yourself with curl and the Studio journal, then confirm it with the included smoke script.",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByText(/studio vs code-first/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cloneable lab kit/i)).not.toBeInTheDocument();
    expect(screen.getByText(/a lab kit you download and unzip/i)).toBeInTheDocument();
  });

  it("contains no em dash or en dash in the Training page source or rendered copy", () => {
    const source = readFileSync(new URL("./Training.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/[\u2013\u2014]/);

    const { container } = renderTraining();
    expect(container.innerHTML).not.toMatch(/[\u2013\u2014]/);
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
    expect(
      screen.getByText("Team 5: 5 seats, completion certificates, and 90 days of email Q&A."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Team 10: 10 seats, completion certificates, 90 days of email Q&A, plus a 60-minute live team Q&A.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not live/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/self-paced → private workshop → certifications/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/certification/i)).not.toBeInTheDocument();
  });
});
