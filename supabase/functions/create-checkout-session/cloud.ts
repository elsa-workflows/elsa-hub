import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  customerFailureResponse,
  type EnvReader,
  getOrCreateStripeCustomer,
  type StripeCustomerClient,
  type StripeCustomerStore,
} from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  buildCloudCheckoutMetadata,
  classifyStripeDataObject,
  CLOUD_LINK_READ_FAILED,
  CLOUD_ORGANIZATION_REQUIRED,
  CLOUD_SUBSCRIPTION_EXISTS_CODE,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  cloudOrganizationIdFromBody,
  orgHasBlockingCloudSubscription,
  readCloudPriceId,
  unlinkedControlOrganizationError,
} from "../_shared/cloud-billing.ts";
import { jsonResponse, noStoreHeaders } from "../_shared/cloud-http.ts";
import { readValidatedControlOrganizationId } from "../_shared/cloud-organization-link.ts";

/**
 * How long a new Cloud Checkout Session stays open. Stripe accepts 30 minutes
 * to 24 hours; a minute over the minimum absorbs clock skew. Short, so an
 * abandoned session stops being reused soon.
 */
const CLOUD_CHECKOUT_SESSION_TTL_SECONDS = 31 * 60;

/** The Stripe surface Cloud checkout uses; the real client satisfies it. */
export type CloudCheckoutStripe = StripeCustomerClient & {
  subscriptions: {
    list(params: { customer: string; limit?: number }): Promise<{
      data: Array<{ id: string; status: string; metadata?: Record<string, string> | null }>;
    }>;
  };
  checkout: {
    sessions: {
      list(params: { customer: string; status: "open"; limit?: number }): Promise<{
        data: Array<{ url: string | null; metadata?: Record<string, string> | null }>;
      }>;
      create(params: Stripe.Checkout.SessionCreateParams): Promise<{ url: string | null }>;
    };
  };
};

export type CloudCheckoutContext = {
  req: Request;
  user: { id: string; email?: string | null };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: {
    organizationId?: string;
  };
  env?: EnvReader;
  stripe?: CloudCheckoutStripe;
};

/**
 * Org-only Cloud checkout. The org is the one the request names; `is_org_admin`
 * alone decides whether the caller may bill it. No membership rows are read:
 * the Control link is looked up by that org id, so there is no list of linked
 * orgs to find.
 */
export async function handleCloudCheckout(ctx: CloudCheckoutContext): Promise<Response> {
  const { req, user, userClient, serviceClient, body } = ctx;
  const env = ctx.env ?? Deno.env;

  try {
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"));
  } catch (error) {
    return jsonResponse(503, { error: (error as Error).message });
  }

  const organizationId = cloudOrganizationIdFromBody(body);
  if (!organizationId) {
    return jsonResponse(400, { error: CLOUD_ORGANIZATION_REQUIRED });
  }

  const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
    p_org_id: organizationId,
  });
  if (adminError || !isAdmin) {
    return jsonResponse(403, { error: "Only organization admins can start Cloud checkout" });
  }

  let controlOrganizationId: string | null;
  try {
    controlOrganizationId = await readValidatedControlOrganizationId(
      serviceClient,
      organizationId,
    );
  } catch (error) {
    console.error("Cloud checkout link read failed:", error);
    return jsonResponse(500, { error: CLOUD_LINK_READ_FAILED });
  }
  if (!controlOrganizationId) {
    const { status, ...unlinked } = unlinkedControlOrganizationError();
    return jsonResponse(status, unlinked);
  }

  let stripePriceId: string;
  try {
    stripePriceId = readCloudPriceId(env);
  } catch (error) {
    return jsonResponse(503, { error: (error as Error).message });
  }

  const { data: org } = await userClient
    .from("organizations")
    .select("name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  const { data: billingProfile } = await serviceClient
    .from("org_billing_profiles")
    .select("company_legal_name, address_line1, address_line2, city, state_province, postal_code, country")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const address = billingProfile?.address_line1
    ? {
        line1: billingProfile.address_line1 || undefined,
        line2: billingProfile.address_line2 || undefined,
        city: billingProfile.city || undefined,
        state: billingProfile.state_province || undefined,
        postal_code: billingProfile.postal_code || undefined,
        country: billingProfile.country || undefined,
      }
    : undefined;

  const stripe: CloudCheckoutStripe = ctx.stripe ?? new Stripe(env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomer(
      { orgId: organizationId },
      {
        stripe,
        // supabase-js's generics are too deep to infer against the structural store type.
        supabase: serviceClient as unknown as StripeCustomerStore,
        env,
        email: user.email ?? undefined,
        name: billingProfile?.company_legal_name || org?.name || undefined,
        address,
        metadata: { organization_id: organizationId, user_id: user.id },
      },
    );
  } catch (error) {
    const failure = customerFailureResponse(error, noStoreHeaders());
    if (failure) return failure;
    throw error;
  }

  // Stripe's default status filter returns every subscription that is not canceled.
  const existing = await stripe.subscriptions.list({ customer: stripeCustomerId, limit: 100 });
  if (orgHasBlockingCloudSubscription(existing.data)) {
    return jsonResponse(409, {
      error: "This organization already has a Cloud subscription",
      code: CLOUD_SUBSCRIPTION_EXISTS_CODE,
    });
  }

  // Two clicks or two admins must not open two Cloud checkouts: reuse an open one.
  const openSessions = await stripe.checkout.sessions.list({
    customer: stripeCustomerId,
    status: "open",
    limit: 100,
  });
  const openCloudSession = openSessions.data.find((session) =>
    session.url && classifyStripeDataObject(session) === "cloud"
  );
  if (openCloudSession) {
    return jsonResponse(200, { checkoutUrl: openCloudSession.url });
  }

  const metadata = buildCloudCheckoutMetadata({
    hubUserId: user.id,
    hubOrganizationId: organizationId,
    controlOrganizationId,
  });

  const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    customer_update: { address: "auto", name: "auto" },
    client_reference_id: controlOrganizationId,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    success_url: `${origin}${cloudCheckoutSuccessPath(org?.slug)}`,
    cancel_url: `${origin}${cloudCheckoutCancelPath(org?.slug)}`,
    expires_at: Math.floor(Date.now() / 1000) + CLOUD_CHECKOUT_SESSION_TTL_SECONDS,
  });

  return jsonResponse(200, { checkoutUrl: session.url });
}
