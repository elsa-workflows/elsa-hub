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

import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import {
  CLOUD_BILLING_NOT_AVAILABLE_YET,
  CLOUD_BILLING_UNAVAILABLE,
  CLOUD_LINK_CHECK_ERROR,
} from "@/lib/cloudClient";
import { ENDED_SUBSCRIPTION_STATUSES } from "@/lib/cloud/billingContract";
import { classifyBillingStatusFailure, useCloudBilling } from "./useCloudBilling";

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
    linkState.data = {
      hub_organization_id: "org-1",
      control_organization_id: "ctrl-1",
      validated_at: "2026-01-01",
    };
    linkState.isPending = false;
    linkState.isFetching = false;
    linkState.isSuccess = true;
    linkState.isError = false;
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

  it("fetches billing when unlinked so an active subscription still offers Manage", async () => {
    linkState.data = null;
    linkState.isSuccess = true;
    invoke.mockResolvedValue({
      data: {
        ...emptySnapshot,
        billingAccount: "linked",
        canManage: true,
        subscriptions: [sub("sub_live", "active")],
      },
      error: null,
    });

    const result = await renderBilling();

    expect(result.current.needsLink).toBe(true);
    expect(functionBodies("cloud-billing")).toEqual([{ organizationId: "org-1" }]);
    expect(result.current.canManage).toBe(true);
    expect(result.current.subscription?.status).toBe("active");
    expect(result.current.planStatus).toBe("active");
    expect(result.current.billingAccount).toBe("linked");
    const hasPlan = Boolean(
      result.current.planName &&
        result.current.planStatus &&
        !ENDED_SUBSCRIPTION_STATUSES.includes(result.current.planStatus),
    );
    expect(hasPlan || result.current.billingAccount === "linked").toBe(true);
  });

  it("shows a retryable link-check error instead of needsLink when the link query fails", async () => {
    linkState.data = null;
    linkState.isSuccess = false;
    linkState.isError = true;

    const result = await renderBilling();

    expect(result.current.needsLink).toBe(false);
    expect(result.current.error?.message).toBe(CLOUD_LINK_CHECK_ERROR);
    expect(result.current.errorRetryable).toBe(true);
    expect(functionBodies("cloud-billing")).toEqual([{ organizationId: "org-1" }]);
  });

  it("maps FunctionsFetchError to a friendly billing message", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new Error("Failed to send a request to the Edge Function")),
    });

    const result = await renderBilling();

    expect(result.current.error?.message).toBe(CLOUD_BILLING_UNAVAILABLE);
    expect(result.current.errorRetryable).toBe(true);
    expect(result.current.unavailable).toBe(false);
    expect(functionBodies("cloud-billing")).toHaveLength(2);
  });

  it.each(["Cloud billing is sandbox-only", "Cloud billing is not configured"])(
    "treats the %s gate as unavailable, not a user-facing error",
    async (internal) => {
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      invoke.mockResolvedValue(httpFailure(503, { error: internal }));

      const result = await renderBilling();

      expect(result.current.unavailable).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.errorRetryable).toBe(false);
      expect(functionBodies("cloud-billing")).toHaveLength(1);
      expect(info).toHaveBeenCalledTimes(1);
      expect(info).toHaveBeenCalledWith("Cloud billing gate:", internal);
      info.mockRestore();
    },
  );

  it("classifies a gate 503 with the public unavailable copy and logs internalMessage", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const failure = classifyBillingStatusFailure(
      new FunctionsHttpError(new Response(JSON.stringify({ error: "Cloud billing is sandbox-only" }), { status: 503 })),
      { error: "Cloud billing is sandbox-only" },
    );
    expect(failure.kind).toBe("gate");
    expect(failure.message).toBe(CLOUD_BILLING_NOT_AVAILABLE_YET);
    expect(failure.internalMessage).toBe("Cloud billing is sandbox-only");
    expect(info).toHaveBeenCalledWith("Cloud billing gate:", failure.internalMessage);
    info.mockRestore();
  });

  it("treats a gateway 503 with no JSON body as a retryable transport error", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(new Response("gateway timeout", { status: 503 })),
    });

    const result = await renderBilling();

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error?.message).toBe(CLOUD_BILLING_UNAVAILABLE);
    expect(result.current.errorRetryable).toBe(true);
  });
});
