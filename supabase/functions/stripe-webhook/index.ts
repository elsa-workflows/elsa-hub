import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("Missing stripe-signature header");
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return new Response(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`Processing event: ${event.type}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (!orderId) {
        console.error("No order_id in session metadata");
        return new Response(
          JSON.stringify({ error: "No order_id in metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, credit_bundles(hours, name)")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("Order not found:", orderError);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Idempotency: if already paid, just try to update receipt URL
      if (order.status === "paid") {
        console.log("Order already paid, checking receipt URL");
        await tryUpdateReceiptUrl(supabase, stripe, order.id, session.payment_intent as string);
        return new Response(
          JSON.stringify({ received: true, message: "Order already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paymentIntentId = session.payment_intent as string;
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 24);

      // Update order to paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: now,
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", orderId)
        .eq("status", "pending"); // Optimistic lock

      if (updateError) {
        console.error("Failed to update order:", updateError);
        // May have been processed by another webhook delivery
        return new Response(
          JSON.stringify({ received: true, message: "Order may have been processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert provider_customers relationship
      await supabase
        .from("provider_customers")
        .upsert(
          {
            organization_id: order.organization_id,
            service_provider_id: order.service_provider_id,
          },
          { onConflict: "organization_id,service_provider_id", ignoreDuplicates: true }
        );

      // Create credit lot
      const minutesPurchased = order.credit_bundles.hours * 60;
      const { data: creditLot, error: lotError } = await supabase
        .from("credit_lots")
        .insert({
          organization_id: order.organization_id,
          service_provider_id: order.service_provider_id,
          order_id: orderId,
          minutes_purchased: minutesPurchased,
          minutes_remaining: minutesPurchased,
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (lotError) {
        // May be duplicate due to webhook retry
        if (lotError.code === "23505") {
          console.log("Credit lot already exists");
        } else {
          console.error("Failed to create credit lot:", lotError);
        }
      }

      // Create ledger entry
      const { error: ledgerError } = await supabase.from("credit_ledger_entries").insert({
        organization_id: order.organization_id,
        service_provider_id: order.service_provider_id,
        entry_type: "credit",
        minutes_delta: minutesPurchased,
        reason_code: "purchase",
        related_order_id: orderId,
        related_credit_lot_id: creditLot?.id,
        actor_type: "system",
        notes: `Purchased ${order.credit_bundles.name} (${order.credit_bundles.hours} hours)`,
      });

      if (ledgerError && ledgerError.code !== "23505") {
        console.error("Failed to create ledger entry:", ledgerError);
      }

      // Get receipt URL
      let receiptUrl: string | null = null;
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });
        const charge = paymentIntent.latest_charge as Stripe.Charge;
        receiptUrl = charge?.receipt_url || null;
      } catch (err) {
        console.error("Failed to get receipt URL:", err);
      }

      // Create/upsert invoice
      await supabase.from("invoices").upsert(
        {
          order_id: orderId,
          organization_id: order.organization_id,
          service_provider_id: order.service_provider_id,
          total_cents: order.amount_cents,
          currency: order.currency,
          status: "paid",
          issued_at: now,
          paid_at: now,
          stripe_receipt_url: receiptUrl,
        },
        { onConflict: "order_id" }
      );

      // Create audit event
      await supabase.from("audit_events").insert({
        organization_id: order.organization_id,
        service_provider_id: order.service_provider_id,
        actor_type: "system",
        entity_type: "order",
        entity_id: orderId,
        action: "paid",
        after_json: {
          bundle_name: order.credit_bundles.name,
          hours: order.credit_bundles.hours,
          amount_cents: order.amount_cents,
          currency: order.currency,
        },
      });

      console.log(`Order ${orderId} fulfilled successfully`);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", orderId)
          .eq("status", "pending");
        console.log(`Order ${orderId} marked as cancelled`);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function tryUpdateReceiptUrl(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  stripe: Stripe,
  orderId: string,
  paymentIntentId: string
) {
  try {
    // Check if invoice already has receipt URL
    const { data: invoice } = await supabase
      .from("invoices")
      .select("stripe_receipt_url")
      .eq("order_id", orderId)
      .single();

    if (invoice?.stripe_receipt_url) {
      return; // Already has receipt URL
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge = paymentIntent.latest_charge as Stripe.Charge;
    const receiptUrl = charge?.receipt_url;

    if (receiptUrl) {
      await supabase
        .from("invoices")
        .update({ stripe_receipt_url: receiptUrl })
        .eq("order_id", orderId);
    }
  } catch (err) {
    console.error("Failed to update receipt URL:", err);
  }
}
