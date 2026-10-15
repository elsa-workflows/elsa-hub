import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getOrCreateStripeCustomer } from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  buildCloudCheckoutMetadata,
  cloudCheckoutCancelPath,
  cloudCheckoutSuccessPath,
  readCloudPriceId,
  resolveControlOrganizationId,
} from "../_shared/cloud-billing.ts";

export type CloudCheckoutContext = {
  req: Request;
  user: { id: string; email?: string | null };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: {
    organizationId?: string;
    controlOrganizationId?: string;
  };
  corsHeaders: Record<string, string>;
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
  const organizationId = body.organizationId?.trim() || undefined;

  try {
    assertStripeTestMode(Deno.env.get("STRIPE_SECRET_KEY"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloud billing is not configured";
    return jsonResponse(corsHeaders, 503, { error: message });
  }

  if (organizationId) {
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
      p_org_id: organizationId,
    });
    if (adminError || !isAdmin) {
      return jsonResponse(corsHeaders, 403, {
        error: "Only organization admins can start Cloud checkout",
      });
    }
  }

  let controlOrganizationId: string;
  try {
    controlOrganizationId = resolveControlOrganizationId({
      controlOrganizationId: body.controlOrganizationId,
      hubOrganizationId: organizationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "A Control organization is required";
    return jsonResponse(corsHeaders, 400, { error: message });
  }

  let stripePriceId: string;
  try {
    stripePriceId = readCloudPriceId();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloud billing is not configured";
    return jsonResponse(corsHeaders, 503, { error: message });
  }

  let orgName: string | undefined;
  if (organizationId) {
    const { data: org } = await userClient
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();
    orgName = org?.name ?? undefined;
  }

  const { data: billingProfile } = organizationId
    ? await serviceClient
        .from("org_billing_profiles")
        .select("company_legal_name, address_line1, address_line2, city, state_province, postal_code, country")
        .eq("organization_id", organizationId)
        .maybeSingle()
    : { data: null };

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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const owner = organizationId ? { orgId: organizationId } : { userId: user.id };
  const stripeCustomerId = await getOrCreateStripeCustomer(owner, {
    stripe,
    serviceClient,
    email: user.email,
    name: billingProfile?.company_legal_name || orgName || undefined,
    address,
    metadata: {
      ...(organizationId ? { organization_id: organizationId } : {}),
      user_id: user.id,
    },
  });

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
