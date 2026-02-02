import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const { bundleId, organizationId } = await req.json();
    if (!bundleId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "bundleId and organizationId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is org admin
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_org_admin", {
      p_org_id: organizationId,
    });
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only organization admins can purchase credits" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization slug for redirect
    const { data: org, error: orgError } = await userClient
      .from("organizations")
      .select("slug")
      .eq("id", organizationId)
      .single();
    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bundle details including billing_type and monthly_hours
    const { data: bundle, error: bundleError } = await userClient
      .from("credit_bundles")
      .select("id, name, hours, monthly_hours, price_cents, currency, stripe_price_id, service_provider_id, is_active, billing_type, recurring_interval")
      .eq("id", bundleId)
      .single();
    if (bundleError || !bundle) {
      return new Response(
        JSON.stringify({ error: "Bundle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!bundle.is_active) {
      return new Response(
        JSON.stringify({ error: "This bundle is no longer available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!bundle.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: "This bundle is not configured for purchase yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // PHASE 1: Check if provider is accepting new purchases (intake pause)
    // =============================================
    const { data: providerSettings, error: providerError } = await userClient
      .from("service_providers")
      .select("accepting_new_purchases, purchase_pause_message, enforce_capacity_gating, total_available_minutes_per_month, capacity_threshold_percent")
      .eq("id", bundle.service_provider_id)
      .single();

    if (providerError) {
      console.error("Provider settings error:", providerError);
      return new Response(
        JSON.stringify({ error: "Failed to verify provider availability" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providerSettings?.accepting_new_purchases) {
      const message = providerSettings?.purchase_pause_message || 
        "We're temporarily limiting new purchases to ensure quality and availability.";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine checkout mode based on billing type
    const isSubscription = bundle.billing_type === "recurring";
    const mode = isSubscription ? "subscription" : "payment";

    // Note: serviceClient already created above for auth verification

    // =============================================
    // PHASE 3: Capacity-aware checkout guard (only if enabled)
    // =============================================
    if (providerSettings?.enforce_capacity_gating && providerSettings?.total_available_minutes_per_month) {
      const { data: capacityMetrics, error: capacityError } = await serviceClient.rpc(
        "get_provider_capacity_metrics",
        { p_provider_id: bundle.service_provider_id }
      );

      if (!capacityError && capacityMetrics && capacityMetrics.length > 0) {
        const metrics = capacityMetrics[0];
        const threshold = providerSettings.capacity_threshold_percent || 90;
        
        if (metrics.utilization_percent >= threshold) {
          return new Response(
            JSON.stringify({ 
              error: "We're currently at capacity. Please contact us to discuss availability." 
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // For subscriptions, we need to get or create a Stripe customer
    let stripeCustomerId: string | undefined;
    if (isSubscription && userEmail) {
      // Check if customer already exists
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            organization_id: organizationId,
            user_id: userId,
          },
        });
        stripeCustomerId = customer.id;
      }
    }

    // For one-time payments, create pending order
    // For subscriptions, we don't create an order until the subscription is confirmed
    let orderId: string | undefined;
    if (!isSubscription) {
      const { data: order, error: orderError } = await serviceClient
        .from("orders")
        .insert({
          organization_id: organizationId,
          service_provider_id: bundle.service_provider_id,
          credit_bundle_id: bundle.id,
          amount_cents: bundle.price_cents,
          currency: bundle.currency,
          status: "pending",
          created_by: userId,
        })
        .select()
        .single();
      if (orderError) {
        console.error("Order creation error:", orderError);
        return new Response(
          JSON.stringify({ error: "Failed to create order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      orderId = order.id;
    }

    // Create Stripe Checkout session
    const origin = req.headers.get("origin") || "https://elsa-hub.lovable.app";
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode,
      line_items: [{ price: bundle.stripe_price_id, quantity: 1 }],
      metadata: {
        organization_id: organizationId,
        service_provider_id: bundle.service_provider_id,
        bundle_id: bundle.id,
        billing_type: bundle.billing_type || "one_time",
        ...(orderId && { order_id: orderId }),
      },
      success_url: `${origin}/org/${org.slug}?payment=success`,
      cancel_url: `${origin}/enterprise/expert-services?payment=cancelled`,
    };

    // For subscriptions, attach customer
    if (isSubscription && stripeCustomerId) {
      sessionConfig.customer = stripeCustomerId;
    } else if (!isSubscription && userEmail) {
      // For one-time payments, prefill email
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update order with checkout session ID (for one-time payments only)
    if (orderId) {
      await serviceClient
        .from("orders")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", orderId);
    }

    return new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Checkout session error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
