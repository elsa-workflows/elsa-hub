import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";
import { buildEmailTemplate, formatDuration } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface WorkLogRow {
  id: string;
  organization_id: string;
  service_provider_id: string;
  performed_at: string;
  category: string;
  description: string;
  minutes_spent: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function categoryLabel(c: string): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function buildDigestContent(
  providerName: string,
  orgName: string,
  digestDate: string,
  entries: WorkLogRow[],
): { content: string; totalMinutes: number } {
  const totalMinutes = entries.reduce((s, e) => s + e.minutes_spent, 0);
  const rows = entries
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at))
    .map((e) => {
      const desc = escapeHtml((e.description || "").slice(0, 240));
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #52525b; vertical-align: top; white-space: nowrap;">${escapeHtml(categoryLabel(e.category))}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #18181b; vertical-align: top;">${desc}</td>
          <td align="right" style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 600; color: #18181b; vertical-align: top; white-space: nowrap;">${escapeHtml(formatDuration(e.minutes_spent))}</td>
        </tr>`;
    })
    .join("");

  const content = `
    <p style="margin: 0 0 16px;">
      Here is a summary of the work <strong>${escapeHtml(providerName)}</strong> logged for
      <strong>${escapeHtml(orgName)}</strong> on <strong>${escapeHtml(digestDate)}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td align="center" style="padding: 20px;">
          <p style="margin: 0; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.04em;">Total logged</p>
          <p style="margin: 6px 0 0; font-size: 28px; font-weight: 700; color: #18181b;">${escapeHtml(formatDuration(totalMinutes))}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #71717a;">${entries.length} ${entries.length === 1 ? "entry" : "entries"}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 12px 0 0;">
      <thead>
        <tr>
          <th align="left" style="padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; border-bottom: 1px solid #e4e4e7;">Category</th>
          <th align="left" style="padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; border-bottom: 1px solid #e4e4e7;">Description</th>
          <th align="right" style="padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #71717a; border-bottom: 1px solid #e4e4e7;">Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  return { content, totalMinutes };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("WORK_DIGEST_CRON_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const providedSecret =
      req.headers.get("x-cron-secret") ??
      new URL(req.url).searchParams.get("secret");
    const authHeader = req.headers.get("Authorization") ?? "";
    const authorized =
      (cronSecret && providedSecret === cronSecret) ||
      authHeader === `Bearer ${serviceKey}`;
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    // Determine target date (UTC day). Defaults to "today" (the day currently
    // in progress in UTC) since we run at end-of-day UTC.
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const now = new Date();
    const targetDate = dateParam
      ? new Date(`${dateParam}T00:00:00Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const digestDate = targetDate.toISOString().slice(0, 10);
    const dayStart = `${digestDate}T00:00:00Z`;
    const dayEndDate = new Date(targetDate);
    dayEndDate.setUTCDate(dayEndDate.getUTCDate() + 1);
    const dayEnd = dayEndDate.toISOString();

    // Pull all billable work logs performed in the target day.
    const { data: logs, error: logsError } = await supabase
      .from("work_logs")
      .select("id, organization_id, service_provider_id, performed_at, category, description, minutes_spent")
      .gte("performed_at", dayStart)
      .lt("performed_at", dayEnd);

    if (logsError) throw logsError;

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({ date: digestDate, groups: 0, sent: 0, message: "No work logged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Group by (org, provider)
    const groups = new Map<string, WorkLogRow[]>();
    for (const l of logs as WorkLogRow[]) {
      const key = `${l.organization_id}:${l.service_provider_id}`;
      const arr = groups.get(key) ?? [];
      arr.push(l);
      groups.set(key, arr);
    }

    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const [key, entries] of groups.entries()) {
      const [organizationId, providerId] = key.split(":");

      // Load org + provider display info
      const [{ data: org }, { data: provider }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug")
          .eq("id", organizationId)
          .maybeSingle(),
        supabase
          .from("service_providers")
          .select("id, name")
          .eq("id", providerId)
          .maybeSingle(),
      ]);

      if (!org || !provider) continue;

      // Load org members
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId);

      const memberIds = (members ?? []).map((m) => m.user_id);
      if (memberIds.length === 0) continue;

      // Load preferences + profiles + already-sent rows in parallel
      const [{ data: prefs }, { data: profiles }, { data: alreadySent }] =
        await Promise.all([
          supabase
            .from("notification_preferences")
            .select("user_id, email_enabled, notify_work_digest")
            .in("user_id", memberIds),
          supabase
            .from("profiles")
            .select("user_id, email, display_name")
            .in("user_id", memberIds),
          supabase
            .from("work_digest_sends")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("service_provider_id", providerId)
            .eq("digest_date", digestDate)
            .in("user_id", memberIds),
        ]);

      const prefMap = new Map<string, { emailEnabled: boolean; digestEnabled: boolean }>();
      for (const p of prefs ?? []) {
        prefMap.set(p.user_id, {
          emailEnabled: p.email_enabled,
          digestEnabled: (p as { notify_work_digest?: boolean }).notify_work_digest ?? true,
        });
      }
      const sentSet = new Set((alreadySent ?? []).map((r) => r.user_id));

      const recipients = (profiles ?? [])
        .filter((p) => !!p.email && !sentSet.has(p.user_id))
        .filter((p) => {
          const pr = prefMap.get(p.user_id);
          if (!pr) return true; // default enabled
          return pr.emailEnabled && pr.digestEnabled;
        });

      if (recipients.length === 0) {
        totalSkipped += memberIds.length;
        continue;
      }

      const { content, totalMinutes } = buildDigestContent(
        provider.name,
        org.name,
        digestDate,
        entries,
      );

      const ctaUrl = `https://elsa-hub.lovable.app/dashboard/org/${org.slug ?? org.id}/workspaces`;

      for (const r of recipients) {
        try {
          const tokenValue = crypto.randomUUID();
          const tokenHash = await sha256(tokenValue);
          await supabase.from("unsubscribe_tokens").insert({
            user_id: r.user_id,
            token_hash: tokenHash,
          });

          const { html, headers } = buildEmailTemplate({
            preheader: `${formatDuration(totalMinutes)} logged by ${provider.name} for ${org.name}`,
            title: `Work summary — ${digestDate}`,
            content,
            ctaText: "Open workspace",
            ctaUrl,
            unsubscribeToken: tokenValue,
            unsubscribeType: "work_digest",
            recipientEmail: r.email as string,
          });

          const { error: emailError } = await resend.emails.send({
            from: "Elsa Workflows <notifications@elsa-workflows.io>",
            to: [r.email as string],
            subject: `${provider.name}: ${formatDuration(totalMinutes)} logged for ${org.name}`,
            html,
            headers,
          });

          if (emailError) {
            console.error(`Send failed to ${r.email}:`, emailError);
            totalFailed++;
            continue;
          }

          await supabase.from("work_digest_sends").insert({
            organization_id: organizationId,
            service_provider_id: providerId,
            user_id: r.user_id,
            digest_date: digestDate,
            work_log_count: entries.length,
            total_minutes: totalMinutes,
          });
          totalSent++;
        } catch (err) {
          console.error("Digest recipient error:", err);
          totalFailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        date: digestDate,
        groups: groups.size,
        sent: totalSent,
        skipped: totalSkipped,
        failed: totalFailed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("send-work-digest error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
