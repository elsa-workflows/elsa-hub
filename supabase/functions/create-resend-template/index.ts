const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // The reusable newsletter template HTML
    // Resend uses triple braces {{{var}}} for unescaped content, double {{var}} for escaped
    const templateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #1a1a2e !important; }
      .email-card { background-color: #2d2d44 !important; border-color: #3d3d5c !important; }
      .text-primary { color: #e5e5e5 !important; }
      .text-secondary { color: #a0a0a0 !important; }
    }
  </style>
</head>
<body class="email-body" style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <!-- Preheader text (hidden preview) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    {{{preheader}}}
  </div>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" style="max-width: 600px;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <img src="https://elsa-hub.lovable.app/elsa-logo.png" 
                   alt="Elsa Workflows" 
                   width="48" height="48" 
                   style="display: block; border-radius: 8px;">
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td class="email-card" style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px;">
              
              <!-- Title -->
              <h1 class="text-primary" style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
                {{{title}}}
              </h1>
              
              <!-- Content -->
              <div class="text-secondary" style="color: #52525b; font-size: 16px; line-height: 1.6;">
                {{{content}}}
              </div>
              
              <!-- CTA Button (optional - include in content if needed) -->
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #71717a;">
                You're receiving this email because you subscribed to Elsa Workflows updates.
              </p>
              <p style="margin: 0; font-size: 13px;">
                <a href="https://elsa-hub.lovable.app/dashboard/settings/notifications" style="color: #6366f1; text-decoration: none;">Manage preferences</a>
                &nbsp;·&nbsp;
                <a href="{{{unsubscribe_url}}}" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #a1a1aa;">
                Elsa Workflows · elsa-workflows.io
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

    // Create template in Resend with variable definitions
    const response = await fetch("https://api.resend.com/templates", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Elsa Workflows Newsletter",
        subject: "{{{subject}}}",
        html: templateHtml,
        variables: [
          { key: "subject", type: "string" },
          { key: "preheader", type: "string" },
          { key: "title", type: "string" },
          { key: "content", type: "string" },
          { key: "unsubscribe_url", type: "string" },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Template created successfully",
        templateId: data.id 
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
