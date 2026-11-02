import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  customerFailureResponse,
  type EnvReader,
  getOrCreateStripeCustomer,
  type StripeCustomerClient,
  type StripeCustomerStore,
  taxLocationFailureResponse,
} from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  buildCloudCheckoutMetadata,
  CLOUD_CHECKOUT_FAILED,
  CLOUD_LINK_READ_FAILED,
  CLOUD_ORGANIZATION_REQUIRED,
  CLOUD_SUBSCRIPTION_EXISTS_CODE,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  cloudOrganizationIdFromBody,
  type CloudCheckoutMetadata,
  type CloudCheckoutSessions,
  CLOUD_PRICE_ID_METADATA_KEY,
  CONTROL_ORGANIZATION_METADATA_KEY,
  expireCheckoutSession,
  HUB_ORGANIZATION_METADATA_KEY,
  listOpenCloudCheckoutSessions,
  type OpenCheckoutSession,
  orgHasBlockingCloudSubscription,
  readCloudPriceId,
  unlinkedControlOrganizationError,
} from "../_shared/cloud-billing.ts";
import { jsonResponse, noStoreHeaders } from "../_shared/cloud-http.ts";
import { readValidatedControlOrganizationId } from "../_shared/cloud-organization-link.ts";
import { trustedSiteOrigin } from "../_shared/site-origin.ts";

/**
 * How long a new Cloud Checkout Session stays open. Stripe accepts 30 minutes
 * to 24 hours; a minute over the minimum absorbs clock skew. Short, so an
 * abandoned session stops being reused soon.
 */
const CLOUD_CHECKOUT_SESSION_TTL_SECONDS = 31 * 60;

/** An open session is handed out only with this long left, so the admin has time to pay. */
const CLOUD_CHECKOUT_REUSE_MIN_SECONDS_LEFT = 10 * 60;

/** The Stripe surface Cloud checkout uses; the real client satisfies it. */
export type CloudCheckoutStripe = StripeCustomerClient & {
  subscriptions: {
    list(params: { customer: string; limit?: number }): Promise<{
      data: Array<{ id: string; status: string; metadata?: Record<string, string> | null }>;
    }>;
  };
  checkout: {
    sessions: CloudCheckoutSessions & {
      create(params: Stripe.Checkout.SessionCreateParams): Promise<{ url: string | null }>;
    };
  };
};

/** The metadata keys an open session must share with this request's to be reused. */
const REUSE_METADATA_KEYS = [
  CONTROL_ORGANIZATION_METADATA_KEY,
  HUB_ORGANIZATION_METADATA_KEY,
  CLOUD_PRICE_ID_METADATA_KEY,
] as const;

/**
 * An open session is reused only when it is the one this request would
 * create (the same Control org, Hub org and price, returning to the same URL)
 * and has at least ten minutes left.
 */
function isReusable(
  session: OpenCheckoutSession,
  metadata: CloudCheckoutMetadata,
  successUrl: string,
  nowSeconds: number,
): boolean {
  return !!session.url &&
    session.expires_at - nowSeconds >= CLOUD_CHECKOUT_REUSE_MIN_SECONDS_LEFT &&
    session.success_url === successUrl &&
    REUSE_METADATA_KEYS.every((key) => session.metadata?.[key] === metadata[key]);
}

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
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"), env);
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

  // Every Stripe call from here on fails into one catch: the customer helper's
  // own generic 500, the Hub's tax-location 400, or a logged generic 500, all
  // no-store. Stripe's message never reaches the client.
  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(
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

    // Stripe's default status filter returns every subscription that is not canceled.
    const existing = await stripe.subscriptions.list({ customer: stripeCustomerId, limit: 100 });
    if (orgHasBlockingCloudSubscription(existing.data)) {
      return jsonResponse(409, {
        error: "This organization already has a Cloud subscription",
        code: CLOUD_SUBSCRIPTION_EXISTS_CODE,
      });
    }

    const metadata = buildCloudCheckoutMetadata({
      hubUserId: user.id,
      hubOrganizationId: organizationId,
      controlOrganizationId,
      priceId: stripePriceId,
    });
    const origin = trustedSiteOrigin(req, env);
    const successUrl = `${origin}${cloudCheckoutSuccessPath(org?.slug)}`;

    // Reuse an open Cloud checkout, so a second click or a second admin gets the
    // same session. That holds only when the requests aren't simultaneous: two
    // that both list before either creates will each open one. When one of them
    // completes, stripe-webhook expires the customer's other open Cloud sessions.
    // An open session that no longer matches (another Control org, price or
    // return URL) or is about to expire is expired rather than handed out.
    const openCloudSessions = await listOpenCloudCheckoutSessions(stripe.checkout.sessions, stripeCustomerId);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const reusable = openCloudSessions.find((session) => isReusable(session, metadata, successUrl, nowSeconds));
    for (const stale of openCloudSessions) {
      if (stale !== reusable) await expireCheckoutSession(stripe.checkout.sessions, stale.id);
    }
    if (reusable) {
      return jsonResponse(200, { checkoutUrl: reusable.url });
    }

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
      success_url: successUrl,
      cancel_url: `${origin}${cloudCheckoutCancelPath(org?.slug)}`,
      expires_at: nowSeconds + CLOUD_CHECKOUT_SESSION_TTL_SECONDS,
    });

    return jsonResponse(200, { checkoutUrl: session.url });
  } catch (error) {
    // The helper has already logged its own failures. Tax location wins, as in
    // the Hub catch: getOrCreateStripeCustomer's customers.update can raise it
    // wrapped in a StripeCustomerError.
    const customerFailure = customerFailureResponse(error, noStoreHeaders());
    if (!customerFailure) console.error("Cloud checkout Stripe call failed:", error);
    return taxLocationFailureResponse(error, noStoreHeaders()) ?? customerFailure ??
      jsonResponse(500, { error: CLOUD_CHECKOUT_FAILED });
  }
}
