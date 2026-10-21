import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { invoke, redirectTo, toastError } = vi.hoisted(() => ({
  invoke: vi.fn(),
  redirectTo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastError } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

// The dashboard-wide selection points at Acme; the Cloud route may name another org.
vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    selectedOrganization: { id: "org-1", name: "Acme", slug: "acme" },
    isAdmin: true,
    loading: false,
  }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({
    organizations: [
      { id: "org-1", name: "Acme", slug: "acme", role: "admin" },
      { id: "org-2", name: "Beta", slug: "beta", role: "member" },
    ],
    loading: false,
  }),
}));

vi.mock("@/lib/cloud/redirect", () => ({ redirectTo }));

import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCloudBilling } from "./useCloudBilling";

/** What supabase-js returns for a non-2xx function response: no data, the body on error.context. */
function httpFailure(status: number, body: Record<string, unknown>) {
  return {
    data: null,
    error: new FunctionsHttpError(new Response(JSON.stringify(body), { status })),
  };
}

const emptySnapshot = {
  billingAccount: "missing",
  controlOrganizationId: null,
  canManage: true,
  subscriptions: [],
  entitlement: null,
};

function sub(id: string, status: string) {
  return { id, status, cancelAtPeriodEnd: false, currentPeriodEnd: null, planName: "Elsa Cloud" };
}

let queryClient: QueryClient;
let path: string;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(Route, { path: "/dashboard/org/:slug/cloud/billing", element: children }),
        createElement(Route, { path: "/dashboard/cloud/billing", element: children }),
      ),
    ),
  );
}

async function renderBilling(at = "/dashboard/org/acme/cloud/billing") {
  path = at;
  const hook = renderHook(() => useCloudBilling(), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook.result;
}

function functionBodies(name: string) {
  return invoke.mock.calls.filter(([called]) => called === name).map(([, options]) => options.body);
}

describe("useCloudBilling", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invoke.mockReset();
    redirectTo.mockReset();
    toastError.mockReset();
    invoke.mockResolvedValue({ data: emptySnapshot, error: null });
  });

  it("starts Cloud checkout for the route's org", async () => {
    invoke.mockImplementation(async (name: string) =>
      name === "create-checkout-session"
        ? { data: { checkoutUrl: "https://checkout.example/session" }, error: null }
        : { data: emptySnapshot, error: null },
    );

    const result = await renderBilling();
    result.current.startCheckout.mutate();

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith("https://checkout.example/session"));
    expect(functionBodies("create-checkout-session")).toEqual([
      { productType: "cloud", organizationId: "org-1" },
    ]);
  });

  it("bills the org named in the route, not the dashboard's selected org", async () => {
    const result = await renderBilling("/dashboard/org/beta/cloud/billing");

    expect(result.current.organizationId).toBe("org-2");
    expect(result.current.isAdmin).toBe(false);
    expect(functionBodies("cloud-billing")).toEqual([{ organizationId: "org-2" }]);
  });

  it("asks for nothing without an org in the route", async () => {
    const result = await renderBilling("/dashboard/cloud/billing");

    expect(result.current.organizationId).toBeUndefined();
    expect(result.current.canManage).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("opens the billing portal when Cloud checkout reports an existing subscription", async () => {
    invoke.mockImplementation(async (name: string) => {
      if (name === "create-checkout-session") {
        return httpFailure(409, {
          error: "This organization already has a Cloud subscription",
          code: "cloud_subscription_exists",
        });
      }
      if (name === "customer-portal") {
        return { data: { url: "https://billing.example/portal" }, error: null };
      }
      return { data: { ...emptySnapshot, billingAccount: "linked" }, error: null };
    });

    const result = await renderBilling();
    result.current.startCheckout.mutate();

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith("https://billing.example/portal"));
    expect(functionBodies("customer-portal")).toEqual([{ productType: "cloud", organizationId: "org-1" }]);
  });

  it("keeps billingAccount as the stored Stripe customer and cloudLink as the Control org link", async () => {
    invoke.mockResolvedValue({ data: { ...emptySnapshot, billingAccount: "linked" }, error: null });

    const result = await renderBilling();

    expect(result.current.billingAccount).toBe("linked");
    expect(result.current.cloudLink).toBe("missing");
    expect(result.current.controlOrganizationId).toBeNull();
  });

  it("sets cloudLink when the snapshot includes a Control organization id", async () => {
    invoke.mockResolvedValue({ data: { ...emptySnapshot, controlOrganizationId: "ctrl-org-1" }, error: null });

    const result = await renderBilling();

    expect(result.current.billingAccount).toBe("missing");
    expect(result.current.cloudLink).toBe("linked");
    expect(result.current.controlOrganizationId).toBe("ctrl-org-1");
  });

  it("shows the server's message when checkout fails", async () => {
    invoke.mockImplementation(async (name: string) =>
      name === "create-checkout-session"
        ? httpFailure(403, { error: "No organization is linked to this account", code: "cloud_org_not_linked" })
        : { data: emptySnapshot, error: null },
    );

    const result = await renderBilling();
    result.current.startCheckout.mutate();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("No organization is linked to this account"));
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it("shows the server's message when the portal fails", async () => {
    invoke.mockImplementation(async (name: string) =>
      name === "customer-portal"
        ? httpFailure(404, { error: "No Cloud billing account yet. Start a Cloud subscription first." })
        : { data: emptySnapshot, error: null },
    );

    const result = await renderBilling();
    result.current.openPortal.mutate();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("No Cloud billing account yet. Start a Cloud subscription first."),
    );
  });

  it("shows the first subscription that has not ended, whatever its status", async () => {
    invoke.mockResolvedValue({
      data: {
        ...emptySnapshot,
        subscriptions: [sub("sub_old", "canceled"), sub("sub_expired", "incomplete_expired"), sub("sub_unpaid", "unpaid")],
      },
      error: null,
    });

    const result = await renderBilling();

    expect(result.current.subscription?.id).toBe("sub_unpaid");
    expect(result.current.planStatus).toBe("unpaid");
  });

  it("reports no subscription when every Cloud subscription has ended", async () => {
    invoke.mockResolvedValue({
      data: {
        ...emptySnapshot,
        subscriptions: [sub("sub_old", "canceled"), sub("sub_expired", "incomplete_expired")],
      },
      error: null,
    });

    const result = await renderBilling();

    expect(result.current.subscription).toBeNull();
    expect(result.current.planStatus).toBeNull();
  });

  it("reports the server's message when status fails", async () => {
    invoke.mockResolvedValue(httpFailure(503, { error: "Cloud billing is sandbox-only" }));

    const result = await renderBilling();

    expect(result.current.error?.message).toBe("Cloud billing is sandbox-only");
  });
});
