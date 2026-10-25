import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CLOUD_ORGANIZATION_LINK_QUERY_KEY,
  useCloudOrganizationLink,
} from "@/hooks/useCloudOrganizationLink";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  CLOUD_BILLING_UNAVAILABLE_CODE,
  CLOUD_ORGANIZATION_REQUIRED,
  CLOUD_PRODUCT_TYPE,
  CLOUD_SUBSCRIPTION_EXISTS_CODE,
  ENDED_SUBSCRIPTION_STATUSES,
} from "@/lib/cloud/billingContract";
import {
  CLOUD_BILLING_NOT_AVAILABLE_YET,
  CLOUD_BILLING_UNAVAILABLE,
  CLOUD_LINK_CHECK_ERROR,
} from "@/lib/cloudClient";
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

type FunctionPayload = Record<string, unknown> & { error?: string; code?: string; state?: string };

export type CloudBillingStatusKind = "gate" | "transport" | "status";

export class CloudBillingStatusError extends Error {
  readonly kind: CloudBillingStatusKind;
  readonly retryable: boolean;
  readonly internalMessage?: string;

  constructor(input: {
    kind: CloudBillingStatusKind;
    message: string;
    retryable: boolean;
    internalMessage?: string;
  }) {
    super(input.message);
    this.name = "CloudBillingStatusError";
    this.kind = input.kind;
    this.retryable = input.retryable;
    this.internalMessage = input.internalMessage;
  }
}

const LINK_CHECK_ERROR = new Error(CLOUD_LINK_CHECK_ERROR);

function isRetryableTransportError(error: unknown): boolean {
  return error instanceof FunctionsFetchError || error instanceof FunctionsRelayError;
}

function httpStatus(error: unknown): number | undefined {
  return error instanceof FunctionsHttpError ? error.context?.status : undefined;
}

function gateMessage(payload: FunctionPayload | null): string | null {
  const message = typeof payload?.error === "string" ? payload.error.trim() : "";
  return message || null;
}

function isLegacyGateErrorText(message: string | null): boolean {
  return message === "Cloud billing is sandbox-only" || message === "Cloud billing is not configured";
}

function isBillingGate(payload: FunctionPayload | null): boolean {
  if (payload?.code === CLOUD_BILLING_UNAVAILABLE_CODE) return true;
  // Fallback for one release while cloud-billing may still omit `code`.
  // Remove after both sides ship billing_unavailable.
  return isLegacyGateErrorText(gateMessage(payload));
}

export function billingStatusErrorMessage(
  error: unknown,
  payload: FunctionPayload | null,
): string {
  if (isRetryableTransportError(error)) return CLOUD_BILLING_UNAVAILABLE;
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  return CLOUD_BILLING_UNAVAILABLE;
}

export function classifyBillingStatusFailure(
  error: unknown,
  payload: FunctionPayload | null,
): CloudBillingStatusError {
  if (isRetryableTransportError(error)) {
    return new CloudBillingStatusError({
      kind: "transport",
      message: CLOUD_BILLING_UNAVAILABLE,
      retryable: true,
    });
  }

  const status = httpStatus(error);
  const internal = gateMessage(payload);
  // Handler gate: 503 with `code: billing_unavailable` (preferred) or the
  // assertStripeTestMode error text (fallback). A 503 with no JSON body is
  // an edge/gateway outage, not the Stripe gate.
  if (status === 503 && isBillingGate(payload)) {
    const gate = new CloudBillingStatusError({
      kind: "gate",
      message: CLOUD_BILLING_NOT_AVAILABLE_YET,
      retryable: false,
      internalMessage: internal ?? payload?.code,
    });
    console.info("Cloud billing gate:", gate.internalMessage);
    return gate;
  }
  if (status === 503) {
    return new CloudBillingStatusError({
      kind: "transport",
      message: CLOUD_BILLING_UNAVAILABLE,
      retryable: true,
    });
  }

  return new CloudBillingStatusError({
    kind: "status",
    message: billingStatusErrorMessage(error, payload),
    retryable: true,
  });
}

/**
 * Invokes a Cloud billing function and returns its JSON body on success and on
 * failure alike. supabase-js returns no data for a non-2xx response; the body
 * (with the server's message and code) is on the FunctionsHttpError's context.
 */
async function invokeCloudFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<{ payload: FunctionPayload | null; error: unknown; failure: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) {
    return { payload: data, error: null, failure: typeof data?.error === "string" ? data.error : null };
  }
  let payload: FunctionPayload | null = null;
  if (error instanceof FunctionsHttpError) {
    payload = await error.context.clone().json().catch(() => null);
  }
  return { payload, error, failure: payload?.error || error.message || "Request failed" };
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
  const orgLink = useCloudOrganizationLink(organizationId);
  const linkLoading = Boolean(organizationId) && (orgLink.isPending || orgLink.isFetching);

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
    retry: (failureCount, error) => {
      if (error instanceof CloudBillingStatusError && error.kind === "gate") return false;
      return failureCount < 1;
    },
    retryDelay: 0,
    queryFn: async (): Promise<CloudBillingSnapshot> => {
      const { payload, error } = await invokeCloudFunction("cloud-billing", {
        organizationId: requireOrganizationId(),
      });
      if (error || typeof payload?.error === "string") {
        throw classifyBillingStatusFailure(error, payload);
      }
      const controlOrganizationId =
        typeof payload?.controlOrganizationId === "string" && payload.controlOrganizationId.trim()
          ? payload.controlOrganizationId.trim()
          : null;
      return {
        billingAccount: payload?.billingAccount === "linked" ? "linked" : "missing",
        cloudLink: controlOrganizationId ? "linked" : "missing",
        controlOrganizationId,
        canManage: payload?.canManage === true,
        subscriptions: Array.isArray(payload?.subscriptions) ? payload.subscriptions : [],
        entitlement: payload?.entitlement ?? null,
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
  const stripeSubscription = snapshot?.subscriptions?.find(
    (sub) => !ENDED_SUBSCRIPTION_STATUSES.includes(sub.status),
  );

  const planName = snapshot?.entitlement?.planName || stripeSubscription?.planName || null;
  const planStatus = snapshot?.entitlement?.status || stripeSubscription?.status || null;
  const canManage = snapshot?.canManage ?? isAdmin;
  const billingError = statusQuery.error instanceof Error ? statusQuery.error : null;
  const unavailable = billingError instanceof CloudBillingStatusError && billingError.kind === "gate";
  const linkCheckFailed = Boolean(organizationId) && orgLink.isError;
  const error = linkCheckFailed ? LINK_CHECK_ERROR : unavailable ? null : billingError;
  const errorRetryable =
    linkCheckFailed ||
    Boolean(!unavailable && billingError instanceof CloudBillingStatusError && billingError.retryable);

  return {
    organizationId,
    isAdmin,
    orgLoading,
    isLoading: statusQuery.isLoading || orgLoading || linkLoading,
    needsLink: Boolean(organizationId) && orgLink.isSuccess && !orgLink.data,
    unavailable,
    error,
    errorRetryable,
    snapshot,
    billingAccount: snapshot?.billingAccount ?? "missing",
    cloudLink: snapshot?.cloudLink ?? "missing",
    controlOrganizationId: snapshot?.controlOrganizationId ?? null,
    planName,
    planStatus,
    subscription: stripeSubscription ?? null,
    canManage,
    startCheckout,
    openPortal,
    refresh: () => {
      void queryClient.invalidateQueries({ queryKey: ["cloud-billing"] });
      void queryClient.invalidateQueries({ queryKey: CLOUD_ORGANIZATION_LINK_QUERY_KEY });
    },
  };
}
