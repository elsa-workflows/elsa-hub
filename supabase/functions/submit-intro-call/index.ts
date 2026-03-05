import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { full_name, company_name, email, project_stage, current_usage, discussion_topics, interests, user_id } = body;

    // Validate required fields
    if (!full_name || !company_name || !email || !project_stage || !current_usage || !discussion_topics) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabaseAdmin
      .from("intro_call_requests")
      .insert({
        full_name,
        company_name,
        email,
        project_stage,
        current_usage,
        discussion_topics,
        interests: interests || [],
        user_id: user_id || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger notification to provider admins (server-side, using service role)
    try {
      const notifResponse = await fetch(
        `${supabaseUrl}/functions/v1/create-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            recipientUserIds: [], // Will be auto-populated by create-notification for intro_call_submitted
            type: "intro_call_submitted",
            title: "New Intro Call Request",
            message: `${full_name} from ${company_name} submitted an intro call request`,
            payload: {
              request_id: data.id,
              company_name,
              full_name,
              email,
              project_stage,
            },
            actionUrl: "/dashboard/provider/valence-works/customers",
          }),
        }
      );
      const notifResult = await notifResponse.json();
      console.log("Intro call notification result:", notifResult);
    } catch (notifErr) {
      console.error("Failed to send intro call notification:", notifErr);
      // Don't fail the main operation
    }

    return new Response(
      JSON.stringify({ id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
