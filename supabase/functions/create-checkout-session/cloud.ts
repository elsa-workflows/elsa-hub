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
  CLOUD_LINK_READ_FAILED,
  CLOUD_SUBSCRIPTION_EXISTS_CODE,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  orgHasBlockingCloudSubscription,
  readCloudPriceId,
  readLinkedHubAdminOrganizations,
  selectLinkedHubOrganization,
  unlinkedControlOrganizationError,
} from "../_shared/cloud-billing.ts";
import { readValidatedControlOrganizationId } from "../_shared/cloud-organization-link.ts";

/** The Stripe surface Cloud checkout uses; the real client satisfies it. */
export type CloudCheckoutStripe = StripeCustomerClient & {
  subscriptions: {
    list(params: { customer: string; limit?: number }): Promise<{
      data: Array<{ id: string; status: string; metadata?: Record<string, string> | null }>;
    }>;
  };
  checkout: {
    sessions: {
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
  corsHeaders: Record<string, string>;
  env?: EnvReader;
  stripe?: CloudCheckoutStripe;
};

function jsonResponse(
  corsHeaders: Record<string, string>,
  status: number,
  payload: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleCloudCheckout(ctx: CloudCheckoutContext): Promise<Response> {
  const { req, user, userClient, serviceClient, body, corsHeaders } = ctx;
  const env = ctx.env ?? Deno.env;

  try {
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"));
  } catch (error) {
    return jsonResponse(corsHeaders, 503, { error: (error as Error).message });
  }

  let memberships: Awaited<ReturnType<typeof readLinkedHubAdminOrganizations>>;
  try {
    memberships = await readLinkedHubAdminOrganizations(userClient, user.id);
  } catch (error) {
    return jsonResponse(corsHeaders, 500, { error: (error as Error).message });
  }

  const linked = selectLinkedHubOrganization(memberships, body.organizationId);
  if ("error" in linked) {
    return jsonResponse(corsHeaders, linked.status, {
      error: linked.error,
      ...(linked.code ? { code: linked.code } : {}),
    });
  }
  const organizationId = linked.organizationId;

  const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
    p_org_id: organizationId,
  });
  if (adminError || !isAdmin) {
    return jsonResponse(corsHeaders, 403, {
      error: "Only organization admins can start Cloud checkout",
    });
  }

  let controlOrganizationId: string | null;
  try {
    controlOrganizationId = await readValidatedControlOrganizationId(
      serviceClient,
      organizationId,
    );
  } catch (error) {
    console.error("Cloud checkout link read failed:", error);
    return jsonResponse(corsHeaders, 500, { error: CLOUD_LINK_READ_FAILED });
  }
  if (!controlOrganizationId) {
    const { status, ...unlinked } = unlinkedControlOrganizationError();
    return jsonResponse(corsHeaders, status, unlinked);
  }

  let stripePriceId: string;
  try {
    stripePriceId = readCloudPriceId(env);
  } catch (error) {
    return jsonResponse(corsHeaders, 503, { error: (error as Error).message });
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
    const failure = customerFailureResponse(error, corsHeaders);
    if (failure) return failure;
    throw error;
  }

  // Stripe's default status filter returns every subscription that is not canceled.
  const existing = await stripe.subscriptions.list({ customer: stripeCustomerId, limit: 100 });
  if (orgHasBlockingCloudSubscription(existing.data)) {
    return jsonResponse(corsHeaders, 409, {
      error: "This organization already has a Cloud subscription",
      code: CLOUD_SUBSCRIPTION_EXISTS_CODE,
    });
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
  });

  return jsonResponse(corsHeaders, 200, { checkoutUrl: session.url });
}
