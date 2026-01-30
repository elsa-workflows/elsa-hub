import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type NotificationType =
  | "org_invitation"
  | "provider_invitation"
  | "work_logged"
  | "purchase_completed"
  | "subscription_renewed"
  | "intro_call_submitted";

interface CreateNotificationRequest {
  recipientUserIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  actionUrl?: string;
}

// Email templates for each notification type
function getEmailTemplate(
  type: NotificationType,
  title: string,
  message: string,
  payload: Record<string, unknown>,
  actionUrl?: string
): { subject: string; html: string } {
  const baseUrl = "https://elsa-hub.lovable.app";
  const fullActionUrl = actionUrl?.startsWith("http") ? actionUrl : `${baseUrl}${actionUrl}`;

  const buttonHtml = actionUrl
    ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${fullActionUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Details
        </a>
      </div>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
        ${buttonHtml}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          Elsa Workflows - Build better workflows
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject: title, html };
}

// Map notification type to preference column
function getPreferenceColumn(type: NotificationType): string | null {
  const map: Record<NotificationType, string> = {
    org_invitation: "notify_org_invitation",
    provider_invitation: "notify_org_invitation", // Use same preference for now
    work_logged: "notify_work_logged",
    purchase_completed: "notify_purchase",
    subscription_renewed: "notify_subscription",
    intro_call_submitted: "notify_intro_call",
  };
  return map[type] || null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateNotificationRequest = await req.json();
    let { recipientUserIds, type, title, message, payload, actionUrl } = body;

    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, title, message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Auto-populate recipients for intro_call_submitted if not provided
    if ((!recipientUserIds || recipientUserIds.length === 0) && type === "intro_call_submitted") {
      // Get all provider admins (currently just one provider: Skywalker Digital)
      const { data: admins } = await supabase
        .from("provider_members")
        .select("user_id")
        .in("role", ["owner", "admin"]);

      recipientUserIds = admins?.map((a) => a.user_id) || [];
      console.log(`Auto-populated ${recipientUserIds.length} provider admins for intro_call notification`);
    }

    if (!recipientUserIds?.length) {
      return new Response(
        JSON.stringify({ error: "No recipients specified" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let created = 0;
    let emailsSent = 0;

    for (const userId of recipientUserIds) {
      // Insert notification record
      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        message,
        payload,
        action_url: actionUrl,
      });

      if (insertError) {
        console.error(`Failed to create notification for user ${userId}:`, insertError);
        continue;
      }
      created++;

      // Check email preferences and send email
      if (resendApiKey) {
        try {
          // Get user's email
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", userId)
            .single();

          if (!profile?.email) {
            console.log(`No email found for user ${userId}`);
            continue;
          }

          // Check preferences
          const preferenceColumn = getPreferenceColumn(type);
          const selectFields = preferenceColumn 
            ? `email_enabled, ${preferenceColumn}`
            : "email_enabled";
          const { data: prefs } = await supabase
            .from("notification_preferences")
            .select(selectFields)
            .eq("user_id", userId)
            .single();

          // Default to true if no preferences exist
          const prefsData = prefs as Record<string, boolean> | null;
          const emailEnabled = prefsData?.email_enabled ?? true;
          const typeEnabled = preferenceColumn && prefsData ? prefsData[preferenceColumn] ?? true : true;

          if (emailEnabled && typeEnabled) {
            const resend = new Resend(resendApiKey);
            const { subject, html } = getEmailTemplate(type, title, message, payload, actionUrl);

            const { error: emailError } = await resend.emails.send({
              from: "Elsa Workflows <noreply@resend.dev>",
              to: [profile.email],
              subject,
              html,
            });

            if (emailError) {
              console.error(`Failed to send email to ${profile.email}:`, emailError);
            } else {
              emailsSent++;
            }
          }
        } catch (emailErr) {
          console.error(`Email processing error for user ${userId}:`, emailErr);
        }
      }
    }

    console.log(`Created ${created} notifications, sent ${emailsSent} emails`);

    return new Response(
      JSON.stringify({ success: true, created, emailsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in create-notification:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
