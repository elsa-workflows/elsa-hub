import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { invoke, redirectTo } = vi.hoisted(() => ({
  invoke: vi.fn(),
  redirectTo: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    selectedOrganization: { id: "org-1", name: "Acme", slug: "acme" },
    isAdmin: true,
    loading: false,
  }),
}));

vi.mock("@/lib/cloud/redirect", () => ({ redirectTo }));

import { useCloudBilling } from "./useCloudBilling";

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCloudBilling", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invoke.mockReset();
    redirectTo.mockReset();
    invoke.mockResolvedValue({
      data: {
        billingAccount: "missing",
        canManage: true,
        subscriptions: [],
        entitlement: null,
      },
      error: null,
    });
  });

  it("starts Cloud checkout on the stored Hub customer path", async () => {
    invoke.mockImplementation(async (name: string) => {
      if (name === "create-checkout-session") {
        return { data: { checkoutUrl: "https://checkout.example/session" }, error: null };
      }
      return {
        data: { billingAccount: "missing", canManage: true, subscriptions: [], entitlement: null },
        error: null,
      };
    });

    const { result } = renderHook(() => useCloudBilling(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.startCheckout.mutate();
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        "create-checkout-session",
        expect.objectContaining({
          body: {
            productType: "cloud",
            organizationId: "org-1",
          },
        }),
      ),
    );
  });

  it("opens the billing portal when Cloud checkout reports an existing subscription", async () => {
    invoke.mockImplementation(async (name: string) => {
      if (name === "create-checkout-session") {
        return {
          data: {
            error: "This organization already has an active Cloud subscription",
            code: "cloud_subscription_exists",
          },
          error: { message: "Edge function returned a non-2xx status code" },
        };
      }
      if (name === "customer-portal") {
        return { data: { url: "https://billing.example/portal" }, error: null };
      }
      return {
        data: { billingAccount: "linked", canManage: true, subscriptions: [], entitlement: null },
        error: null,
      };
    });

    const { result } = renderHook(() => useCloudBilling(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.startCheckout.mutate();
    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith("https://billing.example/portal"));
    expect(invoke).toHaveBeenCalledWith(
      "customer-portal",
      expect.objectContaining({
        body: {
          productType: "cloud",
          organizationId: "org-1",
        },
      }),
    );
  });
});
