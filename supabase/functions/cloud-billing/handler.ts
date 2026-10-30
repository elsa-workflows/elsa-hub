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
  CLOUD_BILLING_UNAVAILABLE_CODE,
  CLOUD_LINK_READ_FAILED,
  CLOUD_ORGANIZATION_REQUIRED,
  CLOUD_PLAN_NAME,
  cloudLinkFromControlOrganizationId,
  cloudOrganizationIdFromBody,
  readControlEntitlement,
} from "../_shared/cloud-billing.ts";
import type { ControlFetch } from "../_shared/cloud-control.ts";
import { jsonResponse, noStoreHeaders } from "../_shared/cloud-http.ts";
import { readValidatedControlOrganizationId } from "../_shared/cloud-organization-link.ts";

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
  accessToken?: string;
  controlFetch?: ControlFetch;
};

function cloudSubscriptionView(sub: Stripe.Subscription) {
  const periodEnd = sub.items?.data?.[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return {
    id: sub.id,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    planName: CLOUD_PLAN_NAME,
  };
}

/**
 * The customer's Cloud subscriptions. The first page of live ones (Stripe's
 * default filter skips canceled) covers any realistic customer; ended ones are
 * listed only when no live Cloud subscription is on that page.
 */
async function listCloudSubscriptions(
  stripe: CloudBillingStripe,
  customer: string,
): Promise<Stripe.Subscription[]> {
  const cloudOnly = (page: { data: Stripe.Subscription[] }) =>
    page.data.filter((sub) => classifyStripeDataObject(sub) === "cloud");
  const live = cloudOnly(await stripe.subscriptions.list({ customer, limit: 100 }));
  if (live.length > 0) return live;
  return cloudOnly(await stripe.subscriptions.list({ customer, status: "ended", limit: 100 }));
}

/**
 * Org-only Cloud billing status for an org member. Reads the stored org
 * customer (read-only, never creates) and the validated Control link.
 * Failures return generic messages; the detail is logged.
 */
export async function handleCloudBillingStatus(ctx: CloudBillingStatusContext): Promise<Response> {
  const { userClient, serviceClient, env } = ctx;

  const organizationId = cloudOrganizationIdFromBody(ctx.body);
  if (!organizationId) return jsonResponse(400, { error: CLOUD_ORGANIZATION_REQUIRED });

  const { data: isMember } = await userClient.rpc("is_org_member", { p_org_id: organizationId });
  if (!isMember) return jsonResponse(403, { error: "Forbidden" });
  const { data: isAdmin } = await userClient.rpc("is_org_admin", { p_org_id: organizationId });
  const canManage = isAdmin === true;

  try {
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"));
  } catch (error) {
    return jsonResponse(503, {
      error: (error as Error).message,
      code: CLOUD_BILLING_UNAVAILABLE_CODE,
    });
  }

  let customerId: string | null;
  try {
    customerId = await getStoredStripeCustomerId(
      { orgId: organizationId },
      // supabase-js's generics are too deep to infer against the structural store type.
      { supabase: serviceClient as unknown as StripeCustomerStore, env },
    );
  } catch (error) {
    const failure = customerFailureResponse(error, noStoreHeaders());
    if (failure) return failure;
    throw error;
  }

  let controlOrganizationId: string | null;
  try {
    controlOrganizationId = await readValidatedControlOrganizationId(serviceClient, organizationId);
  } catch (error) {
    console.error("Cloud billing status link read failed:", error);
    return jsonResponse(500, { error: CLOUD_LINK_READ_FAILED });
  }

  // Control hosted-subscription can sit on its 15s timeout. Read Stripe in
  // parallel so /cloud/billing still returns the stored customer's status.
  const [entitlement, subscriptions] = await Promise.all([
    readControlEntitlement({
      accessToken: ctx.accessToken,
      controlOrganizationId,
      controlFetch: ctx.controlFetch,
    }),
    customerId
      ? listCloudSubscriptions(ctx.stripe(), customerId).then((subs) =>
        subs.map(cloudSubscriptionView)
      )
      : Promise.resolve([]),
  ]);

  return jsonResponse(200, {
    billingAccount: customerId ? "linked" : "missing",
    cloudLink: cloudLinkFromControlOrganizationId(controlOrganizationId),
    controlOrganizationId,
    canManage,
    subscriptions,
    entitlement,
  });
}
