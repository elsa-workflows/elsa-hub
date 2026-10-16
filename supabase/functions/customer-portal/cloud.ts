import Stripe from "https://esm.sh/stripe@18.5.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  assertStripeTestMode,
  cloudBillingCustomerOwner,
  cloudPortalReturnPath,
  readStoredStripeCustomerId,
  stripeLivemodeFromSecret,
} from "../_shared/cloud-billing.ts";

export type CloudPortalContext = {
  req: Request;
  user: { id: string; email?: string | null };
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  body: {
    organizationId?: string;
  };
  corsHeaders: Record<string, string>;
  env?: { get(key: string): string | undefined };
  stripe?: {
    billingPortal: {
      sessions: {
        create: (params: { customer: string; return_url: string }) => Promise<{ url: string }>;
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

export async function handleCloudPortal(ctx: CloudPortalContext): Promise<Response> {
  const { req, user, userClient, serviceClient, body, corsHeaders } = ctx;
  const env = ctx.env ?? Deno.env;
  const organizationId = body.organizationId?.trim() || undefined;

  try {
    assertStripeTestMode(env.get("STRIPE_SECRET_KEY"));
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
        error: "Only organization admins can manage Cloud billing",
      });
    }
  }

  const owner = cloudBillingCustomerOwner({
    organizationId,
    userId: user.id,
  });

  let customerId: string | null;
  try {
    customerId = await readStoredStripeCustomerId(
      serviceClient,
      owner,
      stripeLivemodeFromSecret(env.get("STRIPE_SECRET_KEY")),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read stored Stripe customer";
    return jsonResponse(corsHeaders, 500, { error: message });
  }

  if (!customerId) {
    return jsonResponse(corsHeaders, 404, {
      error: "No Cloud billing account yet. Start a Cloud subscription first.",
    });
  }

  const stripe = ctx.stripe ?? new Stripe(env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}${cloudPortalReturnPath()}`,
  });

  return jsonResponse(corsHeaders, 200, { url: portalSession.url });
}
