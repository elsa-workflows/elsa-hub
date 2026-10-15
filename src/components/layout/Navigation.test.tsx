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
  it("links Cloud on desktop and in the mobile menu", () => {
    renderNav();
    expect(document.querySelectorAll('a[href="/cloud"]').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));
    const cloud = screen.getAllByRole("link", { name: "Cloud" });
    expect(cloud.length).toBeGreaterThanOrEqual(1);
    expect(cloud.some((link) => link.getAttribute("href") === "/cloud")).toBe(true);
  });

  it("marks Cloud as the current page on /cloud routes", () => {
    renderNav("/cloud/engines/1");
    const cloud = screen.getAllByRole("link", { name: "Cloud" });
    expect(cloud.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });
});
