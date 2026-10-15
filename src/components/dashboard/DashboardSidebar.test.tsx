import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";

const dashboardState = vi.hoisted(() => ({
  contextType: "org" as "org" | "provider" | "admin" | null,
  slug: "acme" as string | null,
  isAdminContext: false,
}));

const ownedState = vi.hoisted(() => ({
  ownsCloud: false,
  ownsAcademy: false,
  ownsNothing: true,
  academyLoading: false,
}));

vi.mock("./ContextSwitcher", () => ({
  ContextSwitcher: () => <div>Acme Ltd (org)</div>,
}));

vi.mock("@/contexts/DashboardContext", () => ({
  useDashboardContext: () => dashboardState,
}));

vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => ({ data: false }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({ organizations: [{ id: "org-1", slug: "acme", name: "Acme Ltd" }] }),
}));

vi.mock("@/hooks/useOwnedHubProducts", () => ({
  useOwnedHubProducts: () => ownedState,
}));

function renderSidebar(path = "/dashboard/org/acme") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <DashboardSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("DashboardSidebar org regroup", () => {
  it("shows Overview, Inbox, Services, Explore products, and Organization when the org owns nothing", () => {
    dashboardState.contextType = "org";
    dashboardState.slug = "acme";
    dashboardState.isAdminContext = false;
    ownedState.ownsCloud = false;
    ownedState.ownsAcademy = false;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme",
    );
    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/messages",
    );
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Engagements" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/workspaces",
    );
    expect(screen.getByRole("link", { name: "Credits & Hours" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/credits",
    );
    expect(screen.getByRole("link", { name: "Explore products" })).toHaveAttribute(
      "href",
      "/academy",
    );
    expect(screen.queryByRole("link", { name: "Elsa Cloud" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Academy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Messages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Workspaces" })).not.toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );
  });

  it("shows Elsa Cloud engines when the user already has Cloud", () => {
    dashboardState.contextType = "org";
    dashboardState.slug = "acme";
    ownedState.ownsCloud = true;
    ownedState.ownsAcademy = false;
    renderSidebar("/dashboard/org/acme/cloud");

    expect(screen.getByRole("link", { name: "Elsa Cloud" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
    expect(screen.getByRole("link", { name: "Engines" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
    expect(screen.queryByRole("link", { name: "Explore products" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Subscription" })).not.toBeInTheDocument();
  });

  it("keeps Cloud reachable without a Hub org", () => {
    dashboardState.contextType = null;
    dashboardState.slug = null;
    dashboardState.isAdminContext = false;
    ownedState.ownsCloud = true;
    ownedState.ownsAcademy = false;
    renderSidebar("/dashboard/cloud");

    expect(screen.getByRole("link", { name: "Elsa Cloud" })).toHaveAttribute(
      "href",
      "/dashboard/cloud",
    );
    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
  });
});
