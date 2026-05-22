import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id ?? "");
    const reason = (body.reason ?? "requested_by_customer") as RefundReason;
    const notes: string | null = body.notes ?? null;
    const amountCentsIn: number | null =
      typeof body.amount_cents === "number" && body.amount_cents > 0
        ? Math.floor(body.amount_cents)
        : null;

    if (!orderId) return json({ error: "order_id is required" }, 400);
    if (!["duplicate", "fraudulent", "requested_by_customer"].includes(reason)) {
      return json({ error: "Invalid reason" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Fetch the order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, service_provider_id, organization_id, status, amount_cents, stripe_payment_intent_id, refunded_amount_cents")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return json({ error: "Order not found" }, 404);
    }

    // Auth: caller must be provider admin (function reads auth.uid())
    const { data: isAdminUser, error: roleErr } = await userClient.rpc("is_provider_admin", {
      p_provider_id: order.service_provider_id,
    });
    if (roleErr || !isAdminUser) {
      return json({ error: "Forbidden: provider admin required" }, 403);
    }

    if (order.status !== "paid") {
      return json({ error: `Order is not refundable (status: ${order.status})` }, 400);
    }
    if (!order.stripe_payment_intent_id) {
      return json({ error: "Order has no Stripe payment to refund" }, 400);
    }

    const alreadyRefunded = order.refunded_amount_cents ?? 0;
    const remainingRefundable = order.amount_cents - alreadyRefunded;
    if (remainingRefundable <= 0) {
      return json({ error: "Order is already fully refunded" }, 400);
    }

    const refundAmount = amountCentsIn ?? remainingRefundable;
    if (refundAmount > remainingRefundable) {
      return json(
        { error: `Refund amount exceeds remaining refundable (${remainingRefundable} cents)` },
        400
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: amountCentsIn ?? undefined, // omit for full refund of remaining
      reason,
      metadata: {
        order_id: order.id,
        initiated_by_user_id: userId,
        ...(notes ? { internal_notes: notes.slice(0, 500) } : {}),
      },
    });

    return json({
      ok: true,
      refund_id: refund.id,
      amount_cents: refund.amount,
      status: refund.status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("refund-order error:", msg);
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
