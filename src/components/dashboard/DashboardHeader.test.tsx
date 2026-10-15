import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  DASHBOARD_AVATAR_MENU_LINKS,
  LEGACY_PROFILE_PATHS,
  PROFILE_SETTINGS_PATH,
} from "@/lib/authRedirect";
import { DashboardHeader } from "./DashboardHeader";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "qa@example.com" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: null }),
}));

vi.mock("@/components/notifications", () => ({
  NotificationBell: () => null,
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <DashboardHeader />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

function ExistingAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<div>home</div>} />
      <Route path="/dashboard" element={<Outlet />}>
        <Route path="settings" element={<div data-testid="profile-settings">settings</div>} />
        <Route path="settings/profile" element={<Navigate to={PROFILE_SETTINGS_PATH} replace />} />
      </Route>
      <Route path="/profile" element={<Navigate to={PROFILE_SETTINGS_PATH} replace />} />
      <Route path="*" element={<div data-testid="not-found">404</div>} />
    </Routes>
  );
}

describe("DashboardHeader avatar menu", () => {
  it("points Profile Settings at the real settings route, not /profile", () => {
    renderHeader();
    const profile = screen.getByRole("link", { name: /profile settings/i });
    expect(profile).toHaveAttribute("href", PROFILE_SETTINGS_PATH);
    expect(profile).not.toHaveAttribute("href", "/profile");
    expect(profile).not.toHaveAttribute("href", "/dashboard/settings/profile");
    expect(screen.getByText(/^sign out$/i)).toBeInTheDocument();
  });

  it("resolves every avatar menu link to an existing route", () => {
    const appSrc = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
    expect(appSrc).toContain('path="/profile"');
    expect(appSrc).toContain('path="settings/profile"');
    expect(appSrc).toContain("PROFILE_SETTINGS_PATH");
    expect(appSrc).toContain('path="settings"');

    expect(DASHBOARD_AVATAR_MENU_LINKS.length).toBeGreaterThan(0);
    for (const item of DASHBOARD_AVATAR_MENU_LINKS) {
      const { getByTestId, queryByTestId, unmount } = render(
        <MemoryRouter initialEntries={[item.to]}>
          <ExistingAppRoutes />
        </MemoryRouter>,
      );
      expect(getByTestId("profile-settings")).toBeInTheDocument();
      expect(queryByTestId("not-found")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("redirects legacy /profile paths to settings", () => {
    for (const path of LEGACY_PROFILE_PATHS) {
      const { getByTestId, queryByTestId, unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <ExistingAppRoutes />
        </MemoryRouter>,
      );
      expect(getByTestId("profile-settings")).toBeInTheDocument();
      expect(queryByTestId("not-found")).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe("DashboardHeader render safety", () => {
  it("renders the avatar menu without an effect loop", () => {
    const { rerender } = renderHeader();
    expect(screen.getByRole("link", { name: /profile settings/i })).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <SidebarProvider>
          <DashboardHeader />
        </SidebarProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /profile settings/i })).toBeInTheDocument();
  });
});
