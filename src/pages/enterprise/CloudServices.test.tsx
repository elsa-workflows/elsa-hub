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

import CloudServices from "./CloudServices";

function renderPage() {
  return render(
    <MemoryRouter>
      <CloudServices />
    </MemoryRouter>,
  );
}

describe("CloudServices call to action", () => {
  it("keeps the waitlist for anonymous visitors and signs in on Elsa Cloud", () => {
    authState.user = null;
    renderPage();
    const waitlist = screen.getByRole("link", { name: /join the waitlist/i });
    expect(waitlist).toHaveAttribute("href", "https://elsacloud.app/request-trial");
    expect(screen.getByRole("link", { name: /already have access\? sign in/i })).toHaveAttribute(
      "href",
      "https://elsacloud.app",
    );
    expect(screen.getByText("Elsa Cloud is in early access.")).toBeInTheDocument();
  });

  it("keeps the waitlist for signed-in users and sends them to the Hub dashboard", () => {
    authState.user = { id: "user-1" };
    renderPage();
    expect(screen.getByRole("link", { name: /join the waitlist/i })).toHaveAttribute(
      "href",
      "https://elsacloud.app/request-trial",
    );
    expect(screen.getByRole("link", { name: /already have access\? sign in/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: /open elsa cloud/i })).not.toBeInTheDocument();
  });
});
