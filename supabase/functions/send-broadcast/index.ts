const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUDIENCE_ID = "0629ecd8-3255-40a9-bda7-1b3df52e1c61"; // General audience

interface BroadcastRequest {
  subject: string;
  preheader?: string;
  title: string;
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { subject, preheader, title, content }: BroadcastRequest = await req.json();

    if (!subject || !title || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, title, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the email HTML using our branded template
    const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Hidden preheader text -->
  <div style="display: none; font-size: 1px; color: #f4f4f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader || title}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        
        <!-- Content container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
          
          <!-- Logo with brand text -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img src="https://elsa-hub.lovable.app/elsa-logo.png" alt="Elsa" width="44" height="44" style="display: block; border-radius: 10px;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                      <span style="color: #18181b;">Elsa</span>
                      <span style="color: #ec4899;"> Workflows</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              
              <!-- Card content -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Gradient header bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 16px 16px 0 0;"></td>
                </tr>
                
                <!-- Content area -->
                <tr>
                  <td style="padding: 40px 40px 32px 40px;">
                    
                    <!-- Title -->
                    <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #18181b; line-height: 1.3; letter-spacing: -0.5px;">
                      ${title}
                    </h1>
                    
                    <!-- Content -->
                    <div style="color: #3f3f46; font-size: 16px; line-height: 1.7;">
                      ${content}
                    </div>
                    
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 0 0 0; text-align: center;">
              
              <!-- Footer text -->
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; line-height: 1.5;">
                You're receiving this because you subscribed to Elsa Workflows updates.
              </p>
              
              <!-- Footer links -->
              <p style="margin: 0 0 24px 0; font-size: 14px;">
                <a href="https://elsa-hub.lovable.app/dashboard/settings/notifications" style="color: #6366f1; text-decoration: none; font-weight: 500;">Manage preferences</a>
                <span style="color: #d4d4d8; padding: 0 8px;">·</span>
                <a href="{{{ pm:unsubscribe }}}" style="color: #6366f1; text-decoration: none; font-weight: 500;">Unsubscribe</a>
              </p>
              
              <!-- Brand -->
              <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                <span style="color: #18181b;">Elsa</span> <span style="color: #ec4899;">Workflows</span> · elsa-workflows.io
              </p>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
    `.trim();

    // Create broadcast
    const createResponse = await fetch("https://api.resend.com/broadcasts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audience_id: AUDIENCE_ID,
        from: "Elsa Workflows <onboarding@resend.dev>",
        subject: subject,
        html: html,
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error("Failed to create broadcast:", createData);
      return new Response(
        JSON.stringify({ success: false, error: createData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const broadcastId = createData.id;
    console.log("Broadcast created:", broadcastId);

    // Send the broadcast
    const sendResponse = await fetch(`https://api.resend.com/broadcasts/${broadcastId}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const sendData = await sendResponse.json();

    if (!sendResponse.ok) {
      console.error("Failed to send broadcast:", sendData);
      return new Response(
        JSON.stringify({ success: false, error: sendData, broadcastId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Broadcast sent successfully",
        broadcastId: broadcastId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
