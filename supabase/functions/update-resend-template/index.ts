const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_ID = "b624d0a7-a9de-492a-8ab5-9707c193927e";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Beautiful, professional email template with all inline styles
    const templateHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{{subject}}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  
  <!-- Hidden preheader text -->
  <div style="display: none; font-size: 1px; color: #f4f4f5; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    {{{preheader}}}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        
        <!-- Content container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 12px 20px;">
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Elsa Workflows</span>
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
                      {{{title}}}
                    </h1>
                    
                    <!-- Content -->
                    <div style="color: #3f3f46; font-size: 16px; line-height: 1.7;">
                      {{{content}}}
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
                <a href="{{{unsubscribe_url}}}" style="color: #6366f1; text-decoration: none; font-weight: 500;">Unsubscribe</a>
              </p>
              
              <!-- Brand -->
              <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
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

    // Update the existing template
    const response = await fetch(`https://api.resend.com/templates/${TEMPLATE_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Elsa Workflows Newsletter",
        subject: "{{{subject}}}",
        html: templateHtml,
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
        message: "Template updated successfully",
        data 
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
