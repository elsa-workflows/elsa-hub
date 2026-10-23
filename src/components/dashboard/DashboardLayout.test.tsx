import { lazy, Suspense, type ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "founder@elsa.local" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => ({ data: false }),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: null }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({
    organizations: [{ id: "org-1", slug: "acme", name: "Acme Ltd" }],
  }),
}));

vi.mock("@/hooks/useOwnedHubProducts", () => ({
  useOwnedHubProducts: () => ({
    ownsCloud: false,
    ownsAcademy: false,
    ownsNothing: true,
    academyLoading: false,
  }),
  shouldShowOrgCloudNav: () => true,
}));

vi.mock("./ContextSwitcher", () => ({
  ContextSwitcher: () => <div>Org switcher</div>,
}));

vi.mock("@/components/notifications", () => ({
  NotificationBell: () => null,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@/assets/elsa-logo.png", () => ({ default: "logo.png" }));

import { DashboardLayout } from "./DashboardLayout";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function OverviewPage() {
  return <div>Overview page</div>;
}

function renderDashboard({
  path = "/dashboard/org/acme",
  OrdersPage = () => <div>Orders page</div>,
}: {
  path?: string;
  OrdersPage?: ComponentType;
} = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Suspense fallback={<div>Full page loading</div>}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="org/:slug" element={<OverviewPage />} />
            <Route path="org/:slug/orders" element={<OrdersPage />} />
            <Route path="settings" element={<div>Profile settings page</div>} />
          </Route>
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
}

describe("dashboard SPA navigation", () => {
  it("clicks a sidebar item through the router without a full reload", async () => {
    let releaseOrders!: () => void;
    const ordersLoaded = new Promise<void>((resolve) => {
      releaseOrders = resolve;
    });
    const OrdersPage = lazy(async () => {
      await ordersLoaded;
      return { default: () => <div>Orders page</div> };
    });

    renderDashboard({ OrdersPage });

    expect(await screen.findByText("Overview page")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme");
    expect(screen.queryByText("Full page loading")).not.toBeInTheDocument();

    const orders = screen.getByRole("link", { name: "Orders" });
    expect(orders).toHaveAttribute("href", "/dashboard/org/acme/orders");

    // React Router Link calls preventDefault; a plain <a> full reload does not.
    expect(fireEvent.click(orders)).toBe(false);

    expect(screen.queryByText("Full page loading")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeVisible();
    releaseOrders();
    expect(await screen.findByText("Orders page")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme/orders");
    expect(orders).toHaveAttribute("data-active", "true");
  });

  it("keeps Profile on the router and highlights the active item", async () => {
    renderDashboard();
    await screen.findByText("Overview page");

    const profile = screen.getByRole("link", { name: "Profile" });
    expect(profile).toHaveAttribute("href", "/dashboard/settings");
    expect(fireEvent.click(profile)).toBe(false);

    expect(await screen.findByText("Profile settings page")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/settings");
    await waitFor(() => {
      expect(profile).toHaveAttribute("data-active", "true");
    });
  });
});
