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

function openMobileMenu() {
  fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));
}

describe("Navigation Elsa Cloud item", () => {
  it("lists Elsa Cloud under Elsa+ on desktop and in the mobile menu", () => {
    renderNav();
    expect(document.querySelectorAll('a[href="/cloud"]').length).toBe(0);
    expect(screen.getByRole("button", { name: /^elsa\+$/i })).toBeInTheDocument();

    openMobileMenu();
    const cloud = screen.getAllByRole("link", { name: "Elsa Cloud" });
    expect(cloud.length).toBeGreaterThanOrEqual(1);
    expect(cloud.every((link) => link.getAttribute("href") === "/elsa-plus/cloud")).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /managed cloud hosting/i })
        .some((link) => link.getAttribute("href") === "/elsa-plus/cloud-services"),
    ).toBe(true);
  });

  it("marks Elsa Cloud as the current page on /elsa-plus/cloud routes", () => {
    renderNav("/elsa-plus/cloud/engines/1");
    openMobileMenu();
    const cloud = screen.getAllByRole("link", { name: "Elsa Cloud" });
    expect(cloud.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("does not treat managed hosting as Elsa Cloud", () => {
    renderNav("/elsa-plus/cloud-services");
    openMobileMenu();
    const cloud = screen.getAllByRole("link", { name: "Elsa Cloud" });
    expect(cloud.every((link) => link.getAttribute("aria-current") !== "page")).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /managed cloud hosting/i })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });
});
