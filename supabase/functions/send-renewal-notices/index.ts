import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const APP_URL = "https://elsa-hub.lovable.app";

interface SubscriptionRow {
  id: string;
  organization_id: string;
  service_provider_id: string;
  credit_bundle_id: string | null;
  product_id: string | null;
  current_period_end: string;
  status: string;
  cancel_at_period_end: boolean;
  organizations: { id: string; name: string; slug: string | null } | null;
  products: {
    name: string;
    tier: string | null;
    kind: string | null;
    price_cents: number | null;
    currency: string | null;
    recurring_interval: string | null;
  } | null;
  credit_bundles: {
    name: string;
    price_cents: number | null;
    currency: string | null;
    recurring_interval: string | null;
  } | null;
}

function formatMoney(cents: number | null | undefined, currency: string | null | undefined): string {
  const value = (cents ?? 0) / 100;
  const code = (currency ?? "eur").toUpperCase();
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Same auth posture as send-work-digest: cron secret or a valid project key.
    const cronSecret = Deno.env.get("WORK_DIGEST_CRON_SECRET");
    const providedSecret =
      req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
    const authHeader = req.headers.get("Authorization") ?? "";
    const authorized =
      (cronSecret && providedSecret === cronSecret) ||
      authHeader === `Bearer ${serviceKey}` ||
      authHeader === `Bearer ${anonKey}`;
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "true";
    // Window rather than an exact day, so a missed run does not permanently
    // skip a customer: the next run still catches them inside the window.
    const windowStartDays = Number(url.searchParams.get("window_start_days") ?? "29");
    const windowEndDays = Number(url.searchParams.get("window_end_days") ?? "30");
    const now = Date.now();
    const windowStart = new Date(now + windowStartDays * 86400000).toISOString();
    const windowEnd = new Date(now + windowEndDays * 86400000).toISOString();

    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select(
        `id, organization_id, service_provider_id, credit_bundle_id, product_id,
         current_period_end, status, cancel_at_period_end,
         organizations ( id, name, slug ),
         products ( name, tier, kind, price_cents, currency, recurring_interval ),
         credit_bundles ( name, price_cents, currency, recurring_interval )`,
      )
      .eq("status", "active")
      .eq("cancel_at_period_end", false)
      .gte("current_period_end", windowStart)
      .lt("current_period_end", windowEnd);

    if (subsError) throw subsError;

    const candidates = (subs ?? []) as unknown as SubscriptionRow[];
    let notified = 0;
    let skippedAlreadySent = 0;
    let failed = 0;
    const details: Record<string, unknown>[] = [];

    for (const sub of candidates) {
      const org = sub.organizations;
      if (!org) continue;

      const product = sub.products;
      const bundle = sub.credit_bundles;
      const itemName = product?.name ?? bundle?.name ?? "Subscription";
      const priceCents = product?.price_cents ?? bundle?.price_cents ?? 0;
      const currency = product?.currency ?? bundle?.currency ?? "eur";
      const intervalLabel = product?.recurring_interval ?? bundle?.recurring_interval ?? "year";
      const isRuntimeSubscription = product?.kind === "runtime_subscription";

      if (dryRun) {
        details.push({
          subscription_id: sub.id,
          item: itemName,
          renews: sub.current_period_end,
          amount: formatMoney(priceCents, currency),
          runtime: isRuntimeSubscription,
        });
        continue;
      }

      // IDEMPOTENCY: claim the send by inserting first. The UNIQUE
      // (subscription_id, period_end) constraint — not a prior SELECT — is the
      // safety mechanism, so overlapping runs cannot both win the claim.
      const { error: claimError } = await supabase
        .from("subscription_renewal_notices")
        .insert({
          subscription_id: sub.id,
          organization_id: sub.organization_id,
          period_end: sub.current_period_end,
        });

      if (claimError) {
        if (claimError.code === "23505") {
          skippedAlreadySent++;
          continue;
        }
        console.error("Claim insert failed:", claimError);
        failed++;
        continue;
      }

      try {
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              type: "subscription_renewal_upcoming",
              organizationId: sub.organization_id,
              data: {
                organizationName: org.name,
                itemName,
                renewalDate: formatDate(sub.current_period_end),
                amountFormatted: formatMoney(priceCents, currency),
                intervalLabel,
                isRuntimeSubscription,
                manageUrl: `${APP_URL}/dashboard/org/${org.slug ?? org.id}`,
              },
            },
            headers: { Authorization: `Bearer ${serviceKey}` },
          },
        );

        if (sendError) throw sendError;

        console.log(`Renewal notice for subscription ${sub.id}:`, sendResult);
        notified++;
        details.push({
          subscription_id: sub.id,
          organization: org.name,
          item: itemName,
          renews: sub.current_period_end,
          result: sendResult,
        });
      } catch (err) {
        // Release the claim so a later run can retry this renewal.
        console.error(`Renewal notice failed for subscription ${sub.id}:`, err);
        await supabase
          .from("subscription_renewal_notices")
          .delete()
          .eq("subscription_id", sub.id)
          .eq("period_end", sub.current_period_end);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        window: { from: windowStart, to: windowEnd },
        candidates: candidates.length,
        notified,
        skippedAlreadySent,
        failed,
        dryRun,
        details,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("send-renewal-notices error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
