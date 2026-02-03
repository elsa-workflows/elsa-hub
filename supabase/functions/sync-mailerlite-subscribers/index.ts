const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_AUDIENCE_ID = "0629ecd8-3255-40a9-bda7-1b3df52e1c61";

interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
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
    const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }
    if (!MAILERLITE_API_KEY) {
      throw new Error("MAILERLITE_API_KEY not configured");
    }

    // Security: Require platform admin (check via user client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client to verify admin status
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting sync from Resend to MailerLite...");

    // Step 1: Fetch all contacts from Resend
    const resendResponse = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
      }
    );

    if (!resendResponse.ok) {
      const error = await resendResponse.json();
      console.error("Failed to fetch Resend contacts:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch Resend contacts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    const contacts: ResendContact[] = resendData.data || [];
    
    console.log(`Found ${contacts.length} contacts in Resend`);

    // Step 2: Filter only subscribed contacts
    const subscribedContacts = contacts.filter(c => !c.unsubscribed);
    console.log(`${subscribedContacts.length} are subscribed`);

    // Step 3: Add each contact to MailerLite
    const results = {
      total: subscribedContacts.length,
      success: 0,
      alreadyExists: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const contact of subscribedContacts) {
      try {
        const mlResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MAILERLITE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: contact.email.toLowerCase().trim(),
            fields: contact.first_name ? { name: contact.first_name } : undefined,
            status: "active",
          }),
        });

        if (mlResponse.status === 200) {
          // Already exists
          results.alreadyExists++;
        } else if (mlResponse.status === 201) {
          // New subscriber
          results.success++;
        } else {
          const error = await mlResponse.json();
          results.failed++;
          results.errors.push(`${contact.email}: ${error.message || "Unknown error"}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        results.failed++;
        results.errors.push(`${contact.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log("Sync complete:", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Sync completed",
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
