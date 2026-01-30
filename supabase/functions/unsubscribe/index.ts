import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SHA-256 hash function
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type UnsubscribeType = "all" | "newsletter" | "work_logged" | "purchase" | "subscription";

const VALID_TYPES: UnsubscribeType[] = ["all", "newsletter", "work_logged", "purchase", "subscription"];

function getPreferenceUpdates(type: UnsubscribeType): Record<string, boolean> {
  switch (type) {
    case "all":
      return { email_enabled: false };
    case "newsletter":
      return { newsletter_enabled: false };
    case "work_logged":
      return { notify_work_logged: false };
    case "purchase":
      return { notify_purchase: false };
    case "subscription":
      return { notify_subscription: false };
    default:
      return { email_enabled: false };
  }
}

function getTypeLabel(type: UnsubscribeType): string {
  switch (type) {
    case "all":
      return "all email notifications";
    case "newsletter":
      return "the newsletter";
    case "work_logged":
      return "work logged notifications";
    case "purchase":
      return "purchase notifications";
    case "subscription":
      return "subscription notifications";
    default:
      return "notifications";
  }
}

function generateConfirmationPage(success: boolean, type: UnsubscribeType, error?: string): string {
  const typeLabel = getTypeLabel(type);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? "Unsubscribed" : "Error"} - Elsa Workflows</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 48px;
      max-width: 480px;
      text-align: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      color: #18181b;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #52525b;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    .icon.success {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    }
    .icon.error {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .btn-secondary {
      background: #f4f4f5;
      color: #3f3f46;
      margin-left: 12px;
    }
    .btn-secondary:hover {
      background: #e4e4e7;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e4e4e7;
      font-size: 13px;
      color: #71717a;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://elsa-hub.lovable.app/elsa-logo.png" alt="Elsa Workflows" class="logo">
    
    ${success ? `
    <div class="icon success">✓</div>
    <h1>You've been unsubscribed</h1>
    <p>You will no longer receive ${typeLabel} from Elsa Workflows. If this was a mistake, you can update your preferences at any time.</p>
    <a href="https://elsa-hub.lovable.app/dashboard/settings/notifications" class="btn btn-primary">
      Manage Preferences
    </a>
    ` : `
    <div class="icon error">✕</div>
    <h1>Something went wrong</h1>
    <p>${error || "This unsubscribe link is invalid or has already been used. Please try managing your preferences directly."}</p>
    <a href="https://elsa-hub.lovable.app/dashboard/settings/notifications" class="btn btn-primary">
      Manage Preferences
    </a>
    `}
    
    <div class="footer">
      <p>Elsa Workflows · <a href="https://elsa-workflows.io">elsa-workflows.io</a></p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const typeParam = url.searchParams.get("type") || "all";
    
    // Validate type
    const type = VALID_TYPES.includes(typeParam as UnsubscribeType) 
      ? (typeParam as UnsubscribeType) 
      : "all";

    if (!token) {
      const html = generateConfirmationPage(false, type, "No unsubscribe token provided.");
      return new Response(html, {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Hash the incoming token
    const tokenHash = await sha256(token);

    // Look up the token
    const { data: tokenRecord, error: lookupError } = await supabase
      .from("unsubscribe_tokens")
      .select("id, user_id, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (lookupError) {
      console.error("Token lookup error:", lookupError);
      const html = generateConfirmationPage(false, type, "An error occurred. Please try again.");
      return new Response(html, {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!tokenRecord) {
      const html = generateConfirmationPage(false, type, "This unsubscribe link is invalid.");
      return new Response(html, {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (tokenRecord.used_at) {
      const html = generateConfirmationPage(false, type, "This unsubscribe link has already been used.");
      return new Response(html, {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Get the preference updates for this type
    const preferenceUpdates = getPreferenceUpdates(type);

    // Update notification preferences
    const { error: updateError } = await supabase
      .from("notification_preferences")
      .update(preferenceUpdates)
      .eq("user_id", tokenRecord.user_id);

    if (updateError) {
      console.error("Preference update error:", updateError);
      const html = generateConfirmationPage(false, type, "Failed to update preferences. Please try again.");
      return new Response(html, {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Mark token as used
    await supabase
      .from("unsubscribe_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    console.log(`User ${tokenRecord.user_id} unsubscribed from ${type}`);

    // Return success page
    const html = generateConfirmationPage(true, type);
    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });

  } catch (error: unknown) {
    console.error("Unsubscribe error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    const html = generateConfirmationPage(false, "all", message);
    return new Response(html, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
