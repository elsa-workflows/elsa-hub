import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  getOrCreateStripeCustomer,
  type GetOrCreateStripeCustomerDeps,
  type StripeCustomerCreateParams,
  type StripeCustomerOwner,
} from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  buildCloudCheckoutMetadata,
  CLOUD_SUBSCRIPTION_EXISTS_CODE,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  orgHasBlockingCloudSubscription,
  readCloudPriceId,
  readLinkedHubAdminOrganizations,
  readValidatedControlOrganizationId,
  selectLinkedHubOrganization,
  unlinkedControlOrganizationError,
} from "../_shared/cloud-billing.ts";

export type CloudCheckoutContext = {
  req: Request;
  user: { id: string; email?: string | null };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: {
    organizationId?: string;
  };
  corsHeaders: Record<string, string>;
  env?: { get(key: string): string | undefined };
  getOrCreateStripeCustomer?: (
    owner: StripeCustomerOwner,
    deps?: GetOrCreateStripeCustomerDeps,
  ) => Promise<string>;
  readValidatedControlOrganizationId?: (
    hubOrganizationId: string,
  ) => Promise<string | null>;
  stripe?: {
    customers: {
      create: (
        params: StripeCustomerCreateParams,
        options?: { idempotencyKey?: string },
      ) => Promise<{ id: string }>;
      update: (id: string, params: StripeCustomerCreateParams) => Promise<{ id: string }>;
      del: (id: string) => Promise<{ id: string }>;
    };
    subscriptions: {
      list: (params: { customer: string; status?: string; limit?: number }) => Promise<{
        data: Array<{ id: string; status: string; metadata?: Record<string, string> }>;
      }>;
    };
    checkout: {
      sessions: {
        create: (params: Stripe.Checkout.SessionCreateParams) => Promise<{ url: string | null }>;
      };
    };
  };
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
    const message = error instanceof Error ? error.message : "Cloud billing is not configured";
    return jsonResponse(corsHeaders, 503, { error: message });
  }

  let memberships: Awaited<ReturnType<typeof readLinkedHubAdminOrganizations>>;
  try {
    memberships = await readLinkedHubAdminOrganizations(userClient, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read organization membership";
    return jsonResponse(corsHeaders, 500, { error: message });
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

  const resolveControlOrganizationId =
    ctx.readValidatedControlOrganizationId ??
    ((hubOrganizationId: string) =>
      readValidatedControlOrganizationId(serviceClient, hubOrganizationId));
  let controlOrganizationId: string | null;
  try {
    controlOrganizationId = await resolveControlOrganizationId(organizationId);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to read Control organization link";
    return jsonResponse(corsHeaders, 500, { error: message });
  }
  if (!controlOrganizationId) {
    const unlinked = unlinkedControlOrganizationError();
    return jsonResponse(corsHeaders, unlinked.status, {
      error: unlinked.error,
      code: unlinked.code,
    });
  }

  let stripePriceId: string;
  try {
    stripePriceId = readCloudPriceId(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloud billing is not configured";
    return jsonResponse(corsHeaders, 503, { error: message });
  }

  const { data: org } = await userClient
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle();
  const orgName = org?.name ?? undefined;

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

  const stripeSecretKey = env.get("STRIPE_SECRET_KEY");
  const stripe = ctx.stripe ?? new Stripe(stripeSecretKey!, {
    apiVersion: "2025-08-27.basil",
  });

  const resolveCustomer = ctx.getOrCreateStripeCustomer ?? getOrCreateStripeCustomer;
  const stripeCustomerId = await resolveCustomer(
    { orgId: organizationId },
    {
      stripe: {
        customers: {
          create: (params, options) => stripe.customers.create(params, options),
          update: (id, params) => stripe.customers.update(id, params),
          del: (id) => stripe.customers.del(id),
        },
      },
      supabase: serviceClient,
      email: user.email ?? undefined,
      name: billingProfile?.company_legal_name || orgName || undefined,
      address,
      metadata: {
        organization_id: organizationId,
        user_id: user.id,
      },
      stripeSecretKey,
    },
  );

  const existing = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 20,
  });
  if (orgHasBlockingCloudSubscription(existing.data)) {
    return jsonResponse(corsHeaders, 409, {
      error: "This organization already has an active Cloud subscription",
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
    success_url: `${origin}${cloudCheckoutSuccessPath()}`,
    cancel_url: `${origin}${cloudCheckoutCancelPath()}`,
  });

  return jsonResponse(corsHeaders, 200, { checkoutUrl: session.url });
}
