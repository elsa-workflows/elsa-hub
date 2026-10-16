import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/components/notifications", () => ({
  NotificationBell: () => null,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@/assets/elsa-logo.png", () => ({ default: "logo.png" }));

import { Navigation } from "./Navigation";

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
    </MemoryRouter>,
  );
}

describe("Navigation Cloud leaf", () => {
  it("does not keep a duplicate top-level Cloud link", () => {
    renderNav();
    expect(document.querySelectorAll('a[href="/cloud"]').length).toBe(0);
    expect(screen.queryByRole("link", { name: "Cloud" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));
    expect(screen.queryByRole("link", { name: "Cloud" })).not.toBeInTheDocument();
  });

  it("keeps one Elsa Cloud Early access entry pointed at the dashboard Cloud route", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));
    const cloud = screen.getAllByRole("link", { name: /elsa cloud/i });
    expect(cloud.length).toBeGreaterThanOrEqual(1);
    expect(cloud.every((link) => link.getAttribute("href") === "/dashboard/cloud")).toBe(true);
    expect(screen.queryByRole("link", { name: /managed cloud hosting/i })).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("link").filter((link) => link.getAttribute("href") === "/elsa-plus/cloud-services"),
    ).toHaveLength(0);
  });
});
