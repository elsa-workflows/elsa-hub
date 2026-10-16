import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
    </MemoryRouter>,
  );
}

function renderNavWithRoutes(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
      <LocationProbe />
      <Routes>
        <Route path="/" element={<div>home page</div>} />
        <Route path="/features" element={<div>features page</div>} />
        <Route path="/cloud" element={<div>cloud page</div>} />
      </Routes>
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

  it("navigates Cloud through the router without a full reload", () => {
    renderNavWithRoutes("/");
    const cloud = screen.getAllByRole("link", { name: "Cloud" })[0];
    expect(fireEvent.click(cloud)).toBe(false);

    expect(screen.getByTestId("location")).toHaveTextContent("/cloud");
    expect(screen.getByText("cloud page")).toBeInTheDocument();
  });

  it("navigates Product menu items through the router", () => {
    renderNavWithRoutes("/");
    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));
    const features = screen.getByRole("link", { name: "Features" });
    expect(features).toHaveAttribute("href", "/features");
    expect(fireEvent.click(features)).toBe(false);

    expect(screen.getByTestId("location")).toHaveTextContent("/features");
    expect(screen.getByText("features page")).toBeInTheDocument();
  });
});
