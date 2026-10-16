import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { invoke, navigate, redirectTo } = vi.hoisted(() => ({
  invoke: vi.fn(),
  navigate: vi.fn(),
  redirectTo: vi.fn(),
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    selectedOrganization: { id: "org-1", name: "Acme", slug: "acme" },
    isAdmin: true,
    loading: false,
    organizations: [{ id: "org-1", name: "Acme", slug: "acme" }],
    selectOrganization: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({
    organizations: [{ slug: "acme" }],
    loading: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

vi.mock("@/lib/cloud/redirect", () => ({ redirectTo }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

import CloudBilling from "./CloudBilling";

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/org/:slug/cloud/billing" element={<CloudBilling />} />
          <Route path="/dashboard/cloud/billing" element={<CloudBilling />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Cloud billing pages", () => {
  beforeEach(() => {
    invoke.mockReset();
    navigate.mockReset();
    redirectTo.mockReset();
    invoke.mockImplementation(async (name: string) => {
      if (name === "cloud-billing") {
        return {
          data: {
            billingAccount: "linked",
            cloudLink: "linked",
            controlOrganizationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            canManage: true,
            subscriptions: [
              {
                id: "sub_1",
                status: "active",
                cancelAtPeriodEnd: false,
                currentPeriodEnd: "2026-11-15T00:00:00.000Z",
                planName: "Elsa Cloud Hosted",
              },
            ],
            entitlement: { planName: "Elsa Cloud Hosted", status: "active" },
          },
          error: null,
        };
      }
      if (name === "customer-portal") {
        return { data: { url: "https://billing.example/session" }, error: null };
      }
      if (name === "create-checkout-session") {
        return { data: { checkoutUrl: "https://checkout.example/session" }, error: null };
      }
      return { data: null, error: null };
    });
  });

  it("shows the plan on Cloud billing once Control reports the entitlement", async () => {
    renderAt("/dashboard/org/acme/cloud/billing");
    expect(await screen.findByRole("heading", { level: 1, name: "Cloud billing" })).toBeInTheDocument();
    expect(await screen.findByText("Elsa Cloud Hosted")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
  });

  it("opens the Hub billing portal from Cloud billing and never links to public pricing", async () => {
    renderAt("/dashboard/org/acme/cloud/billing");
    const manage = await screen.findByRole("button", { name: /manage or cancel billing/i });
    fireEvent.click(manage);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        "customer-portal",
        expect.objectContaining({
          body: expect.objectContaining({ productType: "cloud", organizationId: "org-1" }),
        }),
      );
    });
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /waitlist/i })).not.toBeInTheDocument();
  });
});
