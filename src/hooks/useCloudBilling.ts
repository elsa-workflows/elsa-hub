import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CLOUD_PRODUCT_TYPE, CLOUD_SUBSCRIPTION_EXISTS_CODE } from "@/lib/cloud/billingContract";
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
  canManage: boolean;
  subscriptions: CloudSubscriptionStatus[];
  entitlement: { planName?: string; status?: string } | null;
};

function functionErrorMessage(
  error: { message?: string } | null,
  data: { error?: string } | null,
  fallback: string,
): string {
  return data?.error || error?.message || fallback;
}

export function useCloudBilling() {
  const { user } = useAuth();
  const { selectedOrganization, isAdmin, loading: orgLoading } = useOrganization();
  const queryClient = useQueryClient();
  const organizationId = selectedOrganization?.id;

  const statusQuery = useQuery({
    queryKey: ["cloud-billing", user?.id, organizationId],
    enabled: !!user && !orgLoading,
    queryFn: async (): Promise<CloudBillingSnapshot> => {
      const { data, error } = await supabase.functions.invoke("cloud-billing", {
        body: {
          ...(organizationId ? { organizationId } : {}),
        },
      });
      if (error || data?.error) {
        throw new Error(functionErrorMessage(error, data, "Failed to load Cloud billing"));
      }
      return data as CloudBillingSnapshot;
    },
  });

  const startCheckout = useMutation({
    mutationFn: async () => {
      if (!organizationId) {
        throw new Error("Cloud checkout requires an organization");
      }
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          productType: CLOUD_PRODUCT_TYPE,
          organizationId,
        },
      });
      if (data?.code === CLOUD_SUBSCRIPTION_EXISTS_CODE) {
        const portal = await supabase.functions.invoke("customer-portal", {
          body: {
            productType: CLOUD_PRODUCT_TYPE,
            organizationId,
          },
        });
        if (portal.error || portal.data?.error || !portal.data?.url) {
          throw new Error(
            functionErrorMessage(portal.error, portal.data, "Failed to open the billing portal"),
          );
        }
        return portal.data.url as string;
      }
      if (error || data?.error) {
        throw new Error(functionErrorMessage(error, data, "Failed to start Cloud checkout"));
      }
      if (!data?.checkoutUrl) {
        throw new Error("No checkout URL returned");
      }
      return data.checkoutUrl as string;
    },
    onSuccess: (checkoutUrl) => {
      redirectTo(checkoutUrl);
    },
  });

  const openPortal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {
          productType: CLOUD_PRODUCT_TYPE,
          ...(organizationId ? { organizationId } : {}),
        },
      });
      if (error || data?.error) {
        throw new Error(functionErrorMessage(error, data, "Failed to open the billing portal"));
      }
      if (!data?.url) {
        throw new Error("No portal URL returned");
      }
      return data.url as string;
    },
    onSuccess: (url) => {
      redirectTo(url);
    },
  });

  const snapshot = statusQuery.data;
  const stripeSubscription = snapshot?.subscriptions?.find((sub) =>
    ["active", "trialing", "past_due", "paused"].includes(sub.status),
  ) ?? snapshot?.subscriptions?.[0];

  const planName = snapshot?.entitlement?.planName || stripeSubscription?.planName || null;
  const planStatus = snapshot?.entitlement?.status || stripeSubscription?.status || null;
  const organizationLinked = snapshot?.billingAccount === "linked";

  return {
    organizationId,
    isAdmin: organizationId ? isAdmin : true,
    organizationLinked,
    orgLoading,
    isLoading: statusQuery.isLoading || orgLoading,
    error: statusQuery.error instanceof Error ? statusQuery.error : null,
    snapshot,
    planName,
    planStatus,
    subscription: stripeSubscription ?? null,
    canManage: snapshot?.canManage ?? (organizationId ? isAdmin : true),
    startCheckout,
    openPortal,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["cloud-billing"] }),
  };
}
