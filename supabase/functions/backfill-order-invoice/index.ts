import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthenticated" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Platform admin gate
    const { data: adminRows, error: adminErr } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (adminErr || !adminRows) {
      return json({ error: "Forbidden: platform admin required" }, 403);
    }

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id || typeof order_id !== "string") {
      return json({ error: "order_id required" }, 400);
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select(
        "id, organization_id, service_provider_id, amount_cents, currency, status, paid_at, stripe_checkout_session_id, stripe_payment_intent_id"
      )
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) {
      return json({ error: "Order not found" }, 404);
    }
    if (order.status !== "paid") {
      return json({ error: `Order status is ${order.status}, expected paid` }, 400);
    }
    if (!order.stripe_checkout_session_id && !order.stripe_payment_intent_id) {
      return json({ error: "Order has no Stripe references" }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    let hostedInvoiceUrl: string | null = null;
    let invoicePdfUrl: string | null = null;
    let receiptUrl: string | null = null;
    let chargeId: string | null = null;

    if (order.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(
        order.stripe_checkout_session_id,
        { expand: ["payment_intent.latest_charge", "invoice"] }
      );

      const invoice = session.invoice && typeof session.invoice !== "string"
        ? session.invoice
        : null;
      if (invoice) {
        invoiceId = invoice.id ?? null;
        invoiceNumber = invoice.number ?? null;
        hostedInvoiceUrl = invoice.hosted_invoice_url ?? null;
        invoicePdfUrl = invoice.invoice_pdf ?? null;
      }

      const pi = session.payment_intent && typeof session.payment_intent !== "string"
        ? session.payment_intent
        : null;
      const charge = pi?.latest_charge && typeof pi.latest_charge !== "string"
        ? pi.latest_charge
        : null;
      if (charge) {
        chargeId = charge.id;
        receiptUrl = charge.receipt_url ?? null;
      }
    } else if (order.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id,
        { expand: ["latest_charge"] }
      );
      const charge = pi.latest_charge && typeof pi.latest_charge !== "string"
        ? pi.latest_charge
        : null;
      if (charge) {
        chargeId = charge.id;
        receiptUrl = charge.receipt_url ?? null;
      }
    }

    const finalReceiptUrl = hostedInvoiceUrl ?? receiptUrl;
    const finalStripeInvoiceId = invoiceId ?? chargeId;

    if (!finalReceiptUrl) {
      return json({ error: "Could not resolve any receipt URL from Stripe" }, 422);
    }

    // Upsert invoice row keyed on order_id
    const { data: existing } = await admin
      .from("invoices")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    const payload = {
      order_id: order.id,
      organization_id: order.organization_id,
      service_provider_id: order.service_provider_id,
      currency: order.currency,
      total_cents: order.amount_cents,
      status: "paid" as const,
      paid_at: order.paid_at,
      issued_at: new Date().toISOString(),
      stripe_invoice_id: finalStripeInvoiceId,
      invoice_number: invoiceNumber,
      hosted_invoice_url: hostedInvoiceUrl,
      invoice_pdf_url: invoicePdfUrl,
      stripe_receipt_url: finalReceiptUrl,
    };

    let writeError: string | null = null;
    if (existing) {
      const { error } = await admin
        .from("invoices")
        .update(payload)
        .eq("id", existing.id);
      writeError = error?.message ?? null;
    } else {
      const { error } = await admin.from("invoices").insert(payload);
      writeError = error?.message ?? null;
    }
    if (writeError) {
      return json({ error: `DB write failed: ${writeError}` }, 500);
    }

    return json({
      ok: true,
      order_id: order.id,
      stripe_invoice_id: finalStripeInvoiceId,
      invoice_number: invoiceNumber,
      hosted_invoice_url: hostedInvoiceUrl,
      invoice_pdf_url: invoicePdfUrl,
      stripe_receipt_url: finalReceiptUrl,
      action: existing ? "updated" : "inserted",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("backfill-order-invoice error:", message);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
