import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  CLOUD_ORGANIZATION_REQUIRED,
  CLOUD_PRODUCT_TYPE,
  CLOUD_SUBSCRIPTION_EXISTS_CODE,
} from "@/lib/cloud/billingContract";
import { isHubOrgAdmin } from "@/lib/cloud/organizationLink";
import { redirectTo } from "@/lib/cloud/redirect";

export type CloudSubscriptionStatus = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  planName: string;
};

export type CloudBillingSnapshot = {
  billingAccount: "missing" | "linked";
  cloudLink: "missing" | "linked";
  controlOrganizationId: string | null;
  canManage: boolean;
  subscriptions: CloudSubscriptionStatus[];
  entitlement: { planName?: string; status?: string } | null;
};

type FunctionPayload = Record<string, unknown> & { error?: string; code?: string };

/**
 * Invokes a Cloud billing function and returns its JSON body on success and on
 * failure alike. supabase-js returns no data for a non-2xx response; the body
 * (with the server's message and code) is on the FunctionsHttpError's context.
 */
async function invokeCloudFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<{ payload: FunctionPayload | null; failure: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) {
    return { payload: data, failure: typeof data?.error === "string" ? data.error : null };
  }
  let payload: FunctionPayload | null = null;
  if (error instanceof FunctionsHttpError) {
    payload = await error.context.json().catch(() => null);
  }
  return { payload, failure: payload?.error || error.message || "Request failed" };
}

function showFailure(error: Error) {
  toast.error(error.message);
}

/**
 * Cloud billing for the org named in the route (`/dashboard/org/:slug/cloud/billing`),
 * like the rest of the Cloud console. Not the dashboard's selected org, which can
 * point elsewhere. Cloud billing is org-only: without an org nothing is requested.
 */
export function useCloudBilling() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const { organizations, loading: orgLoading } = useOrganizations();
  const queryClient = useQueryClient();
  const organization = slug ? organizations.find((org) => org.slug === slug) : undefined;
  const organizationId = organization?.id;
  const isAdmin = isHubOrgAdmin(organization?.role);

  const requireOrganizationId = () => {
    if (!organizationId) throw new Error(CLOUD_ORGANIZATION_REQUIRED);
    return organizationId;
  };

  const portalUrl = async (organizationId: string): Promise<string> => {
    const portal = await invokeCloudFunction("customer-portal", {
      productType: CLOUD_PRODUCT_TYPE,
      organizationId,
    });
    if (portal.failure) throw new Error(portal.failure);
    if (typeof portal.payload?.url !== "string") throw new Error("No portal URL returned");
    return portal.payload.url;
  };

  const statusQuery = useQuery({
    queryKey: ["cloud-billing", user?.id, organizationId],
    enabled: !!user && !!organizationId,
    queryFn: async (): Promise<CloudBillingSnapshot> => {
      const { payload: data, failure } = await invokeCloudFunction("cloud-billing", {
        organizationId: requireOrganizationId(),
      });
      if (failure) throw new Error(failure);
      const controlOrganizationId =
        typeof data?.controlOrganizationId === "string" && data.controlOrganizationId.trim()
          ? data.controlOrganizationId.trim()
          : null;
      return {
        billingAccount: data?.billingAccount === "linked" ? "linked" : "missing",
        cloudLink: controlOrganizationId ? "linked" : "missing",
        controlOrganizationId,
        canManage: data?.canManage === true,
        subscriptions: Array.isArray(data?.subscriptions) ? data.subscriptions : [],
        entitlement: data?.entitlement ?? null,
      } satisfies CloudBillingSnapshot;
    },
  });

  const startCheckout = useMutation({
    mutationFn: async () => {
      const organizationId = requireOrganizationId();
      const checkout = await invokeCloudFunction("create-checkout-session", {
        productType: CLOUD_PRODUCT_TYPE,
        organizationId,
      });
      if (checkout.payload?.code === CLOUD_SUBSCRIPTION_EXISTS_CODE) {
        return await portalUrl(organizationId);
      }
      if (checkout.failure) throw new Error(checkout.failure);
      if (typeof checkout.payload?.checkoutUrl !== "string") {
        throw new Error("No checkout URL returned");
      }
      return checkout.payload.checkoutUrl;
    },
    onSuccess: (url) => redirectTo(url),
    onError: showFailure,
  });

  const openPortal = useMutation({
    mutationFn: () => portalUrl(requireOrganizationId()),
    onSuccess: (url) => redirectTo(url),
    onError: showFailure,
  });

  const snapshot = statusQuery.data;
  const stripeSubscription = snapshot?.subscriptions?.find((sub) =>
    ["active", "trialing", "past_due", "paused"].includes(sub.status),
  ) ?? snapshot?.subscriptions?.[0];

  const planName = snapshot?.entitlement?.planName || stripeSubscription?.planName || null;
  const planStatus = snapshot?.entitlement?.status || stripeSubscription?.status || null;

  return {
    organizationId,
    isAdmin,
    orgLoading,
    isLoading: statusQuery.isLoading || orgLoading,
    error: statusQuery.error instanceof Error ? statusQuery.error : null,
    snapshot,
    billingAccount: snapshot?.billingAccount ?? "missing",
    cloudLink: snapshot?.cloudLink ?? "missing",
    controlOrganizationId: snapshot?.controlOrganizationId ?? null,
    planName,
    planStatus,
    subscription: stripeSubscription ?? null,
    canManage: snapshot?.canManage ?? isAdmin,
    startCheckout,
    openPortal,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["cloud-billing"] }),
  };
}
