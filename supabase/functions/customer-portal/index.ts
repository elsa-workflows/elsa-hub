import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getOrCreateStripeCustomer } from "../_shared/stripe-customer.ts";
import {
  assertStripeTestMode,
  cloudPortalReturnPath,
  isCloudCheckoutRequest,
} from "../_shared/cloud-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user using service client
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id;
    const userEmail = user.email;

    // Parse request body
    const body = await req.json();
    const { organizationId } = body;
    const isCloudPortal = isCloudCheckoutRequest(body);

    if (isCloudPortal) {
      try {
        assertStripeTestMode(Deno.env.get("STRIPE_SECRET_KEY"));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Cloud billing is not configured";
        return new Response(
          JSON.stringify({ error: message }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (organizationId) {
        const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
          p_org_id: organizationId,
        });
        if (adminError || !isAdmin) {
          return new Response(
            JSON.stringify({ error: "Only organization admins can manage Cloud billing" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2025-08-27.basil",
      });
      const owner = organizationId ? { orgId: organizationId } : { userId };
      let customerId: string;
      try {
        customerId = await getOrCreateStripeCustomer(owner, {
          stripe,
          serviceClient,
          email: userEmail,
          createIfMissing: false,
        });
      } catch {
        return new Response(
          JSON.stringify({ error: "No Cloud billing account yet. Start a Cloud subscription first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}${cloudPortalReturnPath()}`,
      });

      return new Response(
        JSON.stringify({ url: portalSession.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is org admin
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
      p_org_id: organizationId,
    });
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only organization admins can manage subscriptions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const customerId = await getOrCreateStripeCustomer(
      { orgId: organizationId },
      {
        stripe: {
          customers: {
            create: (params) => stripe.customers.create(params),
          },
        },
        supabase: serviceClient,
        email: userEmail,
        metadata: {
          organization_id: organizationId,
          user_id: userId,
        },
      },
    );

    // Create customer portal session
    const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/org/${organizationId}`,
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Customer portal error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
