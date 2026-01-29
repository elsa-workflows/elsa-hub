import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

interface EmailTemplate {
  subject: string;
  html: string;
}

// deno-lint-ignore no-explicit-any
function getProviderDashboardUrl(): string {
  return "https://elsa-hub.lovable.app/dashboard";
}

function getOrgCreditsUrl(slug: string): string {
  return `https://elsa-hub.lovable.app/dashboard/org/${slug}/credits`;
}

function generateEmailTemplate(
  type: NotificationType,
  data: Record<string, unknown>
): EmailTemplate {
  switch (type) {
    case "purchase_completed":
      return {
        subject: `💰 New credit purchase from ${data.organizationName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">New Credit Purchase</h1>
            <p style="font-size: 16px; color: #333;">
              <strong>${data.organizationName}</strong> just purchased <strong>${data.bundleName}</strong> (${data.hours} hours).
            </p>
            <p style="font-size: 18px; color: #16a34a; font-weight: bold;">
              Amount: ${data.amountFormatted}
            </p>
            <p style="margin-top: 24px;">
              <a href="${getProviderDashboardUrl()}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View in Dashboard
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 32px;">
              This email was sent from Elsa Hub.
            </p>
          </div>
        `,
      };

    case "work_logged":
      return {
        subject: `⏱️ ${data.providerName} logged work on your account`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Work Logged</h1>
            <p style="font-size: 16px; color: #333;">
              <strong>${data.performerName || data.providerName}</strong> logged 
              <strong>${data.hours}h ${data.minutes}m</strong> of work on your account.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Category</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.category}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Description</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${data.description}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Time Spent</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${data.hours}h ${data.minutes}m</strong></td>
              </tr>
            </table>
            <p style="margin-top: 24px;">
              <a href="${data.creditsUrl || getProviderDashboardUrl()}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Details
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 32px;">
              This email was sent from Elsa Hub.
            </p>
          </div>
        `,
      };

    case "subscription_renewed":
      return {
        subject: `🔄 Subscription renewed for ${data.organizationName || "your organization"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a2e;">Subscription Renewed</h1>
            <p style="font-size: 16px; color: #333;">
              The subscription for <strong>${data.organizationName}</strong> has been renewed.
            </p>
            <p style="font-size: 16px; color: #333;">
              <strong>${data.monthlyHours}</strong> hours have been credited to the account.
            </p>
            <p style="margin-top: 24px;">
              <a href="${getProviderDashboardUrl()}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View in Dashboard
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 32px;">
              This email was sent from Elsa Hub.
            </p>
          </div>
        `,
      };

    default:
      return {
        subject: "Notification from Elsa Hub",
        html: `<p>You have a new notification from Elsa Hub.</p>`,
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

    const emails = profiles
      ?.filter((p) => p.email)
      .map((p) => p.email as string) || [];

    if (emails.length === 0) {
      console.log("No email addresses found for recipients");
      return new Response(
        JSON.stringify({ sent: 0, message: "No email addresses found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email template
    const template = generateEmailTemplate(type, data);

    // Send emails
    const results = await Promise.allSettled(
      emails.map((email) =>
        resend.emails.send({
          from: "Elsa Hub <notifications@elsa-workflows.io>",
          to: [email],
          subject: template.subject,
          html: template.html,
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Notifications sent: ${sent} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({ sent, failed, total: emails.length }),
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
