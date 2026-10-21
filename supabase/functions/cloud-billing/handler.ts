import type Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  customerFailureResponse,
  type EnvReader,
  getStoredStripeCustomerId,
  type StripeCustomerStore,
} from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  classifyStripeDataObject,
  CLOUD_LINK_READ_FAILED,
  CLOUD_ORGANIZATION_REQUIRED,
  cloudLinkFromControlOrganizationId,
  cloudOrganizationIdFromBody,
  readControlEntitlement,
} from "../_shared/cloud-billing.ts";
import { readValidatedControlOrganizationId } from "../_shared/cloud-organization-link.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const headers = { ...corsHeaders, "Cache-Control": "no-store" };

export function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export type CloudBillingStripe = {
  subscriptions: {
    list(params: Stripe.SubscriptionListParams): Promise<{ data: Stripe.Subscription[] }>;
  };
};

export type CloudBillingStatusContext = {
  user: { id: string };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: unknown;
  env: EnvReader;
  stripe: () => CloudBillingStripe;
};

function cloudSubscriptionView(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const product = item?.price?.product;
  const productName = typeof product === "object" && product && "name" in product
    ? String((product as { name?: string }).name ?? "Elsa Cloud")
    : "Elsa Cloud";
  return {
    id: sub.id,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    planName: productName,
  };
}

/**
 * Org-only Cloud billing status for an org member. Reads the stored org
 * customer (read-only, never creates) and the validated Control link.
 * Failures return generic messages; the detail is logged.
 */
export async function handleCloudBillingStatus(ctx: CloudBillingStatusContext): Promise<Response> {
  const { user, userClient, serviceClient, env } = ctx;

  const organizationId = cloudOrganizationIdFromBody(ctx.body);
  if (!organizationId) return json(400, { error: CLOUD_ORGANIZATION_REQUIRED });

  const { data: isMember } = await userClient.rpc("is_org_member", { p_org_id: organizationId });
  if (!isMember) return json(403, { error: "Forbidden" });
  const { data: isAdmin } = await userClient.rpc("is_org_admin", { p_org_id: organizationId });
  const canManage = isAdmin === true;

  try {
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"));
  } catch (error) {
    return json(503, { error: (error as Error).message });
  }

  let customerId: string | null;
  try {
    customerId = await getStoredStripeCustomerId(
      { orgId: organizationId },
      // supabase-js's generics are too deep to infer against the structural store type.
      { supabase: serviceClient as unknown as StripeCustomerStore, env },
    );
  } catch (error) {
    const failure = customerFailureResponse(error, headers);
    if (failure) return failure;
    throw error;
  }

  let controlOrganizationId: string | null;
  try {
    controlOrganizationId = await readValidatedControlOrganizationId(serviceClient, organizationId);
  } catch (error) {
    console.error("Cloud billing status link read failed:", error);
    return json(500, { error: CLOUD_LINK_READ_FAILED });
  }

  const entitlement = await readControlEntitlement({
    hubUserId: user.id,
    hubOrganizationId: organizationId,
  });

  const subscriptions = customerId
    ? (await ctx.stripe().subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
      expand: ["data.items.data.price"],
    })).data
      .filter((sub) => classifyStripeDataObject(sub) === "cloud")
      .map(cloudSubscriptionView)
    : [];

  return json(200, {
    billingAccount: customerId ? "linked" : "missing",
    cloudLink: cloudLinkFromControlOrganizationId(controlOrganizationId),
    controlOrganizationId,
    canManage,
    subscriptions,
    entitlement,
  });
}
