const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");
    if (!MAILERLITE_API_KEY) {
      throw new Error("MAILERLITE_API_KEY not configured");
    }

    const { email, firstName } = await req.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add subscriber to MailerLite
    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        fields: firstName?.trim() ? { name: firstName.trim() } : undefined,
        status: "active",
      }),
    });

    const data = await response.json();

    // MailerLite returns 200 for existing subscribers, 201 for new
    if (response.ok) {
      const isExisting = response.status === 200;
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: isExisting ? "You're already subscribed!" : "Successfully subscribed!",
          alreadySubscribed: isExisting,
          subscriberId: data.data?.id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle validation errors (422)
    if (response.status === 422) {
      console.error("MailerLite validation error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle rate limiting (429)
    if (response.status === 429) {
      console.error("MailerLite rate limit:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.error("MailerLite API error:", data);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to subscribe. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
