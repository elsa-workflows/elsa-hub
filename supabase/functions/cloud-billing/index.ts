import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  assertStripeTestMode,
  classifyStripeDataObject,
  billingAccountFromControlLink,
  cloudBillingCustomerOwner,
  readControlEntitlement,
  readStoredStripeCustomerId,
  readValidatedControlOrganizationId,
  stripeLivemodeFromSecret,
} from "../_shared/cloud-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !user) {
      return json(401, { error: "Unauthorized" });
    }

    const body = await req.json().catch(() => ({}));
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : undefined;
    let canManage = true;

    if (organizationId) {
      const { data: isMember } = await userClient.rpc("is_org_member", {
        p_org_id: organizationId,
      });
      if (!isMember) {
        return json(403, { error: "Forbidden" });
      }
      const { data: isAdmin } = await userClient.rpc("is_org_admin", {
        p_org_id: organizationId,
      });
      canManage = isAdmin === true;
    }

    try {
      assertStripeTestMode(Deno.env.get("STRIPE_SECRET_KEY"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cloud billing is not configured";
      return json(503, { error: message });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const owner = cloudBillingCustomerOwner({
      organizationId,
      userId: user.id,
    });
    const customerId = await readStoredStripeCustomerId(
      serviceClient,
      owner,
      stripeLivemodeFromSecret(Deno.env.get("STRIPE_SECRET_KEY")),
    );

    const entitlement = await readControlEntitlement({
      hubUserId: user.id,
      hubOrganizationId: organizationId ?? null,
    });
    const controlOrganizationId = organizationId
      ? await readValidatedControlOrganizationId(serviceClient, organizationId)
      : null;
    const billingAccount = billingAccountFromControlLink(controlOrganizationId);

    if (!customerId) {
      return json(200, {
        billingAccount,
        controlOrganizationId,
        canManage,
        subscriptions: [],
        entitlement,
      });
    }

    const listed = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
      expand: ["data.items.data.price"],
    });

    const subscriptions = listed.data
      .filter((sub: Stripe.Subscription) => classifyStripeDataObject(sub) === "cloud")
      .map((sub: Stripe.Subscription) => {
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
      });

    return json(200, {
      billingAccount,
      controlOrganizationId,
      canManage,
      subscriptions,
      entitlement,
    });
  } catch (error: unknown) {
    console.error("Cloud billing status error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return json(500, { error: message });
  }
});
