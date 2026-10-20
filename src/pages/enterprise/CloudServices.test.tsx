import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import {
  CLOUD_SIGN_IN_HREF,
  CLOUD_WAITLIST_HREF,
  DASHBOARD_CLOUD_PATH,
} from "@/lib/cloudPaths";
import CloudServices from "./CloudServices";

function renderPage() {
  return render(
    <MemoryRouter>
      <CloudServices />
    </MemoryRouter>,
  );
}

describe("CloudServices call to action", () => {
  it("keeps the waitlist for anonymous visitors and signs in on the Hub", () => {
    authState.user = null;
    renderPage();
    const waitlist = screen.getByRole("link", { name: /join the waitlist/i });
    expect(waitlist).toHaveAttribute("href", CLOUD_WAITLIST_HREF);
    expect(waitlist).toHaveAttribute("href", "/signup?redirect=%2Fdashboard%2Fcloud");
    expect(screen.getByRole("link", { name: /already have access\? sign in/i })).toHaveAttribute(
      "href",
      CLOUD_SIGN_IN_HREF,
    );
    expect(screen.getByRole("link", { name: /already have access\? sign in/i })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fdashboard%2Fcloud",
    );
    expect(screen.getByText("Elsa Cloud is in early access.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /elsacloud\.app/i })).not.toBeInTheDocument();
  });

  it("keeps the waitlist for signed-in users and sends them to the Hub Cloud dashboard", () => {
    authState.user = { id: "user-1" };
    renderPage();
    expect(screen.getByRole("link", { name: /join the waitlist/i })).toHaveAttribute(
      "href",
      CLOUD_WAITLIST_HREF,
    );
    expect(screen.getByRole("link", { name: /already have access\? sign in/i })).toHaveAttribute(
      "href",
      DASHBOARD_CLOUD_PATH,
    );
    expect(screen.queryByRole("link", { name: /open elsa cloud/i })).not.toBeInTheDocument();
  });
});
