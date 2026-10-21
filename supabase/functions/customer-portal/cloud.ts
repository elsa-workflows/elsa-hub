import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  customerFailureResponse,
  type EnvReader,
  getStoredStripeCustomerId,
  type StripeCustomerStore,
} from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  CLOUD_ORGANIZATION_REQUIRED,
  cloudOrganizationIdFromBody,
  cloudPortalReturnPath,
} from "../_shared/cloud-billing.ts";

export type CloudPortalContext = {
  req: Request;
  user: { id: string };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: {
    organizationId?: string;
  };
  corsHeaders: Record<string, string>;
  env?: EnvReader;
  stripe?: {
    billingPortal: {
      sessions: {
        create(params: { customer: string; return_url: string }): Promise<{ url: string }>;
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

/**
 * Org-only and read-only: opens the portal for the org's stored Stripe
 * customer after `is_org_admin`. Never creates a customer, never reads a
 * personal one.
 */
export async function handleCloudPortal(ctx: CloudPortalContext): Promise<Response> {
  const { req, userClient, serviceClient, body, corsHeaders } = ctx;
  const env = ctx.env ?? Deno.env;

  try {
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"));
  } catch (error) {
    return jsonResponse(corsHeaders, 503, { error: (error as Error).message });
  }

  const organizationId = cloudOrganizationIdFromBody(body);
  if (!organizationId) {
    return jsonResponse(corsHeaders, 400, { error: CLOUD_ORGANIZATION_REQUIRED });
  }

  const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
    p_org_id: organizationId,
  });
  if (adminError || !isAdmin) {
    return jsonResponse(corsHeaders, 403, {
      error: "Only organization admins can manage Cloud billing",
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
    const failure = customerFailureResponse(error, corsHeaders);
    if (failure) return failure;
    throw error;
  }

  if (!customerId) {
    return jsonResponse(corsHeaders, 404, {
      error: "No Cloud billing account yet. Start a Cloud subscription first.",
    });
  }

  const { data: org } = await userClient
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .maybeSingle();

  const stripe = ctx.stripe ?? new Stripe(env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}${cloudPortalReturnPath(org?.slug)}`,
  });

  return jsonResponse(corsHeaders, 200, { url: portalSession.url });
}
