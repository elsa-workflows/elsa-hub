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
import { jsonResponse, noStoreHeaders } from "../_shared/cloud-http.ts";
import { trustedSiteOrigin } from "../_shared/site-origin.ts";

export type CloudPortalContext = {
  req: Request;
  user: { id: string };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: {
    organizationId?: string;
  };
  env?: EnvReader;
  stripe?: {
    billingPortal: {
      sessions: {
        create(params: { customer: string; return_url: string }): Promise<{ url: string }>;
      };
    };
  };
};

/**
 * Org-only and read-only: opens the portal for the org's stored Stripe
 * customer after `is_org_admin`. Never creates a customer, never reads a
 * personal one.
 */
export async function handleCloudPortal(ctx: CloudPortalContext): Promise<Response> {
  const { req, userClient, serviceClient, body } = ctx;
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
    return jsonResponse(403, {
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
    const failure = customerFailureResponse(error, noStoreHeaders());
    if (failure) return failure;
    throw error;
  }

  if (!customerId) {
    return jsonResponse(404, {
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

  const origin = trustedSiteOrigin(req, env);
  let portalUrl: string;
  try {
    portalUrl = (await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${cloudPortalReturnPath(org?.slug)}`,
    })).url;
  } catch (error) {
    console.error("Cloud billing portal session failed:", error);
    return jsonResponse(500, { error: "We couldn't open the billing portal. Please try again later." });
  }

  return jsonResponse(200, { url: portalUrl });
}
