import type { ReactNode } from "react";
import { useEffect } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const authStateListeners: Array<(event: string, session: unknown) => void> = [];
let currentSession: { user: { id: string }; access_token: string } | null = {
  user: { id: "u1" },
  access_token: "t1",
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authStateListeners.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session: currentSession } }),
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signInWithOAuth: async () => ({ error: null }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}));

vi.mock("./DashboardSidebar", () => ({
  DashboardSidebar: () => <div>sidebar</div>,
}));

vi.mock("./DashboardHeader", () => ({
  DashboardHeader: () => <div>header</div>,
}));

vi.mock("@/contexts/DashboardContext", () => ({
  DashboardProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
  SidebarInset: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "./DashboardLayout";

let childMounts = 0;

function DashboardChild() {
  useEffect(() => {
    childMounts += 1;
  }, []);
  return <div data-testid="dashboard-child">cloud console</div>;
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/dashboard/org/valence-works/cloud"]}>
          <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route path="org/:slug/cloud" element={<DashboardChild />} />
            </Route>
            <Route path="/login" element={<div>login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("DashboardLayout tab focus", () => {
  beforeEach(() => {
    authStateListeners.length = 0;
    childMounts = 0;
    currentSession = { user: { id: "u1" }, access_token: "t1" };
  });

  it("does not remount the outlet or show a full-page loader on TOKEN_REFRESHED", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId("dashboard-child")).toBeInTheDocument());
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(childMounts).toBe(1);

    authStateListeners[0]("TOKEN_REFRESHED", { user: { id: "u1" }, access_token: "t2" });
    window.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(screen.getByTestId("dashboard-child")).toBeInTheDocument());
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(childMounts).toBe(1);
  });

  it("does not remount the outlet on same-user SIGNED_IN", async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByTestId("dashboard-child")).toBeInTheDocument());
    expect(childMounts).toBe(1);

    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" }, access_token: "t1" });
    window.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(screen.getByTestId("dashboard-child")).toBeInTheDocument());
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(childMounts).toBe(1);
  });
});
