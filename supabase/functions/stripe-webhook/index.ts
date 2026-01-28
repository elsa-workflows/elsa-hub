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
      const billingType = session.metadata?.billing_type;

      if (billingType === "recurring") {
        // Handle subscription checkout completion
        await handleSubscriptionCheckout(supabase, stripe, session);
      } else {
        // Handle one-time payment checkout completion
        await handleOneTimePaymentCheckout(supabase, stripe, session);
      }
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
    } else if (event.type === "invoice.paid") {
      // Handle subscription renewal
      await handleInvoicePaid(supabase, stripe, event.data.object as Stripe.Invoice);
    } else if (event.type === "customer.subscription.updated") {
      // Handle subscription status changes
      await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
    } else if (event.type === "customer.subscription.deleted") {
      // Handle subscription cancellation
      await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
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

// Handle one-time payment checkout (existing logic)
async function handleOneTimePaymentCheckout(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    console.error("No order_id in session metadata");
    return;
  }

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, credit_bundles(hours, name)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("Order not found:", orderError);
    return;
  }

  // Idempotency: if already paid, just try to update receipt URL
  if (order.status === "paid") {
    console.log("Order already paid, checking receipt URL");
    await tryUpdateReceiptUrl(supabase, stripe, order.id, session.payment_intent as string);
    return;
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
    .eq("status", "pending");

  if (updateError) {
    console.error("Failed to update order:", updateError);
    return;
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

  if (lotError && lotError.code !== "23505") {
    console.error("Failed to create credit lot:", lotError);
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
}

// Handle subscription checkout completion
async function handleSubscriptionCheckout(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const organizationId = session.metadata?.organization_id;
  const serviceProviderId = session.metadata?.service_provider_id;
  const bundleId = session.metadata?.bundle_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;

  if (!organizationId || !serviceProviderId || !bundleId || !subscriptionId) {
    console.error("Missing required metadata for subscription checkout");
    return;
  }

  // Check if subscription already exists (idempotency)
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (existingSub) {
    console.log("Subscription already exists:", subscriptionId);
    return;
  }

  // Fetch subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Fetch bundle details
  const { data: bundle, error: bundleError } = await supabase
    .from("credit_bundles")
    .select("id, name, monthly_hours, price_cents, currency")
    .eq("id", bundleId)
    .single();

  if (bundleError || !bundle) {
    console.error("Bundle not found:", bundleError);
    return;
  }

  const now = new Date().toISOString();
  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Create subscription record
  const { data: subRecord, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: organizationId,
      service_provider_id: serviceProviderId,
      credit_bundle_id: bundleId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: subscription.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .select()
    .single();

  if (subError) {
    if (subError.code === "23505") {
      console.log("Subscription already exists (race condition)");
      return;
    }
    console.error("Failed to create subscription:", subError);
    return;
  }

  // Upsert provider_customers relationship
  await supabase
    .from("provider_customers")
    .upsert(
      {
        organization_id: organizationId,
        service_provider_id: serviceProviderId,
      },
      { onConflict: "organization_id,service_provider_id", ignoreDuplicates: true }
    );

  // Grant first month's credits
  await grantSubscriptionCredits(supabase, {
    organizationId,
    serviceProviderId,
    subscriptionId: subRecord.id,
    bundleName: bundle.name,
    monthlyHours: bundle.monthly_hours,
    periodStart,
  });

  // Create audit event
  await supabase.from("audit_events").insert({
    organization_id: organizationId,
    service_provider_id: serviceProviderId,
    actor_type: "system",
    entity_type: "subscription",
    entity_id: subRecord.id,
    action: "created",
    after_json: {
      bundle_name: bundle.name,
      monthly_hours: bundle.monthly_hours,
      status: subscription.status,
    },
  });

  console.log(`Subscription ${subscriptionId} created successfully`);
}

// Handle invoice.paid for subscription renewals
async function handleInvoicePaid(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  _stripe: Stripe,
  invoice: Stripe.Invoice
) {
  // Skip if not a subscription invoice or it's the first invoice (handled by checkout)
  if (!invoice.subscription || invoice.billing_reason === "subscription_create") {
    return;
  }

  const stripeSubscriptionId = invoice.subscription as string;

  // Fetch our subscription record
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("*, credit_bundles(name, monthly_hours)")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (subError || !subscription) {
    console.error("Subscription not found for renewal:", stripeSubscriptionId);
    return;
  }

  // Check if we already granted credits for this period (idempotency)
  const periodStart = new Date(invoice.period_start * 1000).toISOString();
  const { data: existingLot } = await supabase
    .from("credit_lots")
    .select("id")
    .eq("subscription_id", subscription.id)
    .eq("billing_period_start", periodStart)
    .single();

  if (existingLot) {
    console.log("Credits already granted for this period");
    return;
  }

  // Update subscription period dates
  const periodEnd = new Date(invoice.period_end * 1000).toISOString();
  await supabase
    .from("subscriptions")
    .update({
      current_period_start: periodStart,
      current_period_end: periodEnd,
      status: "active",
    })
    .eq("id", subscription.id);

  // Grant monthly credits
  await grantSubscriptionCredits(supabase, {
    organizationId: subscription.organization_id,
    serviceProviderId: subscription.service_provider_id,
    subscriptionId: subscription.id,
    bundleName: subscription.credit_bundles.name,
    monthlyHours: subscription.credit_bundles.monthly_hours,
    periodStart,
  });

  console.log(`Subscription ${stripeSubscriptionId} renewed, credits granted`);
}

// Handle subscription status updates
async function handleSubscriptionUpdated(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  subscription: Stripe.Subscription
) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Failed to update subscription:", error);
  } else {
    console.log(`Subscription ${subscription.id} updated to status: ${subscription.status}`);
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  subscription: Stripe.Subscription
) {
  const { data: subRecord, error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to mark subscription as canceled:", error);
  } else {
    // Create audit event
    await supabase.from("audit_events").insert({
      organization_id: subRecord.organization_id,
      service_provider_id: subRecord.service_provider_id,
      actor_type: "system",
      entity_type: "subscription",
      entity_id: subRecord.id,
      action: "canceled",
      before_json: { status: "active" },
      after_json: { status: "canceled" },
    });
    console.log(`Subscription ${subscription.id} marked as canceled`);
  }
}

// Helper to grant subscription credits
async function grantSubscriptionCredits(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  params: {
    organizationId: string;
    serviceProviderId: string;
    subscriptionId: string;
    bundleName: string;
    monthlyHours: number;
    periodStart: string;
  }
) {
  const { organizationId, serviceProviderId, subscriptionId, bundleName, monthlyHours, periodStart } = params;
  
  const minutesPurchased = monthlyHours * 60;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 24);

  // Create credit lot linked to subscription
  const { data: creditLot, error: lotError } = await supabase
    .from("credit_lots")
    .insert({
      organization_id: organizationId,
      service_provider_id: serviceProviderId,
      subscription_id: subscriptionId,
      billing_period_start: periodStart,
      minutes_purchased: minutesPurchased,
      minutes_remaining: minutesPurchased,
      expires_at: expiresAt.toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (lotError && lotError.code !== "23505") {
    console.error("Failed to create credit lot for subscription:", lotError);
    return;
  }

  // Create ledger entry
  const { error: ledgerError } = await supabase.from("credit_ledger_entries").insert({
    organization_id: organizationId,
    service_provider_id: serviceProviderId,
    entry_type: "credit",
    minutes_delta: minutesPurchased,
    reason_code: "subscription_credit",
    related_credit_lot_id: creditLot?.id,
    actor_type: "system",
    notes: `${bundleName} subscription: ${monthlyHours} hours for period starting ${periodStart.split("T")[0]}`,
  });

  if (ledgerError && ledgerError.code !== "23505") {
    console.error("Failed to create ledger entry for subscription:", ledgerError);
  }
}

async function tryUpdateReceiptUrl(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  stripe: Stripe,
  orderId: string,
  paymentIntentId: string
) {
  try {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("stripe_receipt_url")
      .eq("order_id", orderId)
      .single();

    if (invoice?.stripe_receipt_url) {
      return;
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
