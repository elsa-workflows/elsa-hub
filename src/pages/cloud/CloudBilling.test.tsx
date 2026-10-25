import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { invoke, navigate, redirectTo, toastMessage } = vi.hoisted(() => ({
  invoke: vi.fn(),
  navigate: vi.fn(),
  redirectTo: vi.fn(),
  toastMessage: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { message: toastMessage, success: vi.fn(), error: vi.fn() } }));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({
    organizations: [{ id: "org-1", name: "Acme", slug: "acme", role: "admin" }],
    loading: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

vi.mock("@/lib/cloud/redirect", () => ({ redirectTo }));

const linkState = vi.hoisted(() => ({
  data: { hub_organization_id: "org-1", control_organization_id: "ctrl-1", validated_at: "2026-01-01" } as
    | { hub_organization_id: string; control_organization_id: string; validated_at: string }
    | null,
  isPending: false,
  isFetching: false,
  isSuccess: true,
  isError: false,
}));

vi.mock("@/hooks/useCloudOrganizationLink", () => ({
  useCloudOrganizationLink: () => linkState,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

import { FunctionsHttpError } from "@supabase/supabase-js";
import { CLOUD_BILLING_NEEDS_LINK, CLOUD_BILLING_NOT_AVAILABLE_YET, CLOUD_ERROR_RETRY } from "@/lib/cloudClient";
import CloudBilling from "./CloudBilling";

function httpFailure(status: number, body: Record<string, unknown> | string) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return {
    data: null,
    error: new FunctionsHttpError(new Response(payload, { status })),
  };
}

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
    linkState.data = {
      hub_organization_id: "org-1",
      control_organization_id: "ctrl-1",
      validated_at: "2026-01-01",
    };
    linkState.isSuccess = true;
    linkState.isError = false;
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

  it("says the subscription is unchanged when checkout is cancelled", async () => {
    renderAt("/dashboard/org/acme/cloud/billing?payment=cancelled");

    await waitFor(() =>
      expect(toastMessage).toHaveBeenCalledWith("Checkout cancelled", {
        description: "Your Elsa Cloud subscription was not changed.",
      }),
    );
  });

  it("shows a neutral unavailable notice and the link CTA for an unlinked org on the gate 503", async () => {
    linkState.data = null;
    invoke.mockImplementation(async (name: string) =>
      name === "cloud-billing"
        ? httpFailure(503, { error: "Cloud billing is sandbox-only" })
        : { data: null, error: null },
    );

    renderAt("/dashboard/org/acme/cloud/billing");

    const notice = await screen.findByText(CLOUD_BILLING_NOT_AVAILABLE_YET);
    const alert = notice.closest("[role='alert']");
    expect(alert).toBeInTheDocument();
    expect(alert).not.toHaveClass("text-destructive");
    expect(screen.queryByText(/sandbox-only/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_ERROR_RETRY })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: CLOUD_BILLING_NEEDS_LINK })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
  });

  it("shows only the neutral unavailable notice for a linked org on the gate 503", async () => {
    invoke.mockImplementation(async (name: string) =>
      name === "cloud-billing"
        ? httpFailure(503, { error: "Cloud billing is not configured" })
        : { data: null, error: null },
    );

    renderAt("/dashboard/org/acme/cloud/billing");

    expect(await screen.findByText(CLOUD_BILLING_NOT_AVAILABLE_YET)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_BILLING_NEEDS_LINK)).not.toBeInTheDocument();
    expect(screen.queryByText(/sandbox-only|not configured/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_ERROR_RETRY })).not.toBeInTheDocument();
  });
});
