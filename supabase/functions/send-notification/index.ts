import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildEmailTemplate, formatDuration, formatCurrency } from "../_shared/emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

type NotificationType = 
  | "purchase_completed" 
  | "work_logged" 
  | "subscription_renewed";

interface NotificationRequest {
  type: NotificationType;
  // For direct recipient specification (used by webhook)
  recipientUserIds?: string[];
  // For organization-based lookup (used by frontend)
  organizationId?: string;
  providerId?: string;
  data: Record<string, unknown>;
}

interface EmailContent {
  subject: string;
  preheader?: string;
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeType: "all" | "newsletter" | "work_logged" | "purchase" | "subscription";
}

// SHA-256 hash function for token generation
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getProviderDashboardUrl(): string {
  return "https://elsa-hub.lovable.app/dashboard";
}

function getOrgCreditsUrl(slug: string): string {
  return `https://elsa-hub.lovable.app/dashboard/org/${slug}/credits`;
}

function generateEmailContent(
  type: NotificationType,
  data: Record<string, unknown>
): EmailContent {
  switch (type) {
    case "purchase_completed": {
      const hours = data.hours as number;
      const amount = data.amountFormatted as string || formatCurrency(data.amountCents as number || 0, data.currency as string);
      
      return {
        subject: `💰 New credit purchase from ${data.organizationName}`,
        preheader: `${data.organizationName} purchased ${hours} hours of credits`,
        title: "New Credit Purchase",
        content: `
          <p style="margin: 0 0 16px;">
            <strong>${data.organizationName}</strong> just purchased <strong>${data.bundleName}</strong>.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; border-radius: 12px; margin: 20px 0;">
            <tr>
              <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Hours Purchased</td>
                    <td align="right" style="padding: 8px 0; font-weight: 600; color: #18181b;">${hours} hours</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Amount</td>
                    <td align="right" style="padding: 8px 0; font-weight: 700; font-size: 18px; color: #16a34a;">${amount}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `,
        ctaText: "View in Dashboard",
        ctaUrl: getProviderDashboardUrl(),
        unsubscribeType: "purchase",
      };
    }

    case "work_logged": {
      const totalMinutes = data.totalMinutes as number || ((data.hours as number || 0) * 60 + (data.minutes as number || 0));
      const duration = formatDuration(totalMinutes);
      const category = (data.category as string || "work").charAt(0).toUpperCase() + (data.category as string || "work").slice(1);
      
      return {
        subject: `⏱️ ${data.providerName || "Provider"} logged ${duration} of work`,
        preheader: `${duration} of ${data.category} logged to your account`,
        title: "Work Logged",
        content: `
          <p style="margin: 0 0 16px;">
            <strong>${data.performerName || data.providerName}</strong> logged work on your account.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; border-radius: 12px; margin: 20px 0;">
            <tr>
              <td style="padding: 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Time Spent</td>
                    <td align="right" style="padding: 8px 0; font-weight: 700; font-size: 18px; color: #6366f1;">${duration}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Category</td>
                    <td align="right" style="padding: 8px 0; font-weight: 600; color: #18181b;">${category}</td>
                  </tr>
                  ${data.description ? `
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0; border-top: 1px solid #e4e4e7; margin-top: 8px;">
                      <p style="margin: 8px 0 0; color: #3f3f46; font-size: 14px; line-height: 1.5;">${data.description}</p>
                    </td>
                  </tr>
                  ` : ""}
                </table>
              </td>
            </tr>
          </table>
        `,
        ctaText: "View Credit Balance",
        ctaUrl: data.creditsUrl as string || data.orgSlug ? getOrgCreditsUrl(data.orgSlug as string) : getProviderDashboardUrl(),
        unsubscribeType: "work_logged",
      };
    }

    case "subscription_renewed": {
      const monthlyHours = data.monthlyHours as number;
      
      return {
        subject: `🔄 Subscription renewed - ${monthlyHours} hours credited`,
        preheader: `Your subscription for ${data.organizationName} has been renewed`,
        title: "Subscription Renewed",
        content: `
          <p style="margin: 0 0 16px;">
            Great news! The subscription for <strong>${data.organizationName}</strong> has been successfully renewed.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); background: #dcfce7; border-radius: 12px; margin: 20px 0;">
            <tr>
              <td align="center" style="padding: 24px;">
                <p style="margin: 0; font-size: 14px; color: #166534;">Hours Credited</p>
                <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #15803d;">${monthlyHours} hours</p>
              </td>
            </tr>
          </table>
          <p style="margin: 16px 0 0; color: #52525b;">
            These credits are now available and ready to use.
          </p>
        `,
        ctaText: "View in Dashboard",
        ctaUrl: getProviderDashboardUrl(),
        unsubscribeType: "subscription",
      };
    }

    default:
      return {
        subject: "Notification from Elsa Hub",
        title: "Notification",
        content: "<p>You have a new notification from Elsa Hub.</p>",
        unsubscribeType: "all",
      };
  }
}

function getPreferenceField(type: NotificationType): string {
  switch (type) {
    case "purchase_completed":
      return "notify_purchase";
    case "work_logged":
      return "notify_work_logged";
    case "subscription_renewed":
      return "notify_subscription";
    default:
      return "email_enabled";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: NotificationRequest = await req.json();
    const { type, recipientUserIds, organizationId, providerId, data } = body;

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine recipients
    let userIds: string[] = [];

    if (recipientUserIds && recipientUserIds.length > 0) {
      userIds = recipientUserIds;
    } else if (organizationId) {
      // Get org members
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId);
      userIds = members?.map((m) => m.user_id) || [];
    } else if (providerId) {
      // Get provider admins
      const { data: admins } = await supabase
        .from("provider_members")
        .select("user_id")
        .eq("service_provider_id", providerId)
        .in("role", ["owner", "admin"]);
      userIds = admins?.map((a) => a.user_id) || [];
    }

    if (userIds.length === 0) {
      console.log("No recipients found for notification");
      return new Response(
        JSON.stringify({ sent: 0, message: "No recipients found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch notification preferences
    const preferenceField = getPreferenceField(type);
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .in("user_id", userIds);

    // Create a map of preferences
    const prefMap = new Map<string, { emailEnabled: boolean; typeEnabled: boolean }>();
    if (preferences) {
      for (const p of preferences) {
        prefMap.set(p.user_id, {
          emailEnabled: p.email_enabled,
          typeEnabled: (p as Record<string, unknown>)[preferenceField] as boolean,
        });
      }
    }

    // Filter recipients who have notifications enabled
    // If no preference record exists, default to enabled
    const enabledUserIds = userIds.filter((uid) => {
      const pref = prefMap.get(uid);
      if (!pref) return true; // Default to enabled
      return pref.emailEnabled && pref.typeEnabled;
    });

    if (enabledUserIds.length === 0) {
      console.log("All recipients have notifications disabled");
      return new Response(
        JSON.stringify({ sent: 0, message: "All recipients have notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch email addresses from profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .in("user_id", enabledUserIds);

    const emailRecipients = profiles
      ?.filter((p) => p.email)
      .map((p) => ({ userId: p.user_id, email: p.email as string })) || [];

    if (emailRecipients.length === 0) {
      console.log("No email addresses found for recipients");
      return new Response(
        JSON.stringify({ sent: 0, message: "No email addresses found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email content
    const emailContent = generateEmailContent(type, data);

    // Send emails with unique unsubscribe tokens per recipient
    const results = await Promise.allSettled(
      emailRecipients.map(async ({ userId, email }) => {
        // Generate unique unsubscribe token for this user
        const tokenValue = crypto.randomUUID();
        const tokenHash = await sha256(tokenValue);

        // Store token in database
        await supabase.from("unsubscribe_tokens").insert({
          user_id: userId,
          token_hash: tokenHash,
        });

        // Build email with template
        const { html, headers } = buildEmailTemplate({
          preheader: emailContent.preheader,
          title: emailContent.title,
          content: emailContent.content,
          ctaText: emailContent.ctaText,
          ctaUrl: emailContent.ctaUrl,
          unsubscribeToken: tokenValue,
          unsubscribeType: emailContent.unsubscribeType,
        });

        // Send email with RFC 8058 headers
        return resend.emails.send({
          from: "Elsa Workflows <notifications@elsa-workflows.io>",
          to: [email],
          subject: emailContent.subject,
          html,
          headers,
        });
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Notifications sent: ${sent} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({ sent, failed, total: emailRecipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Notification error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
