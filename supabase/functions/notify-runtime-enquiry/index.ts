import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tierLabels: Record<string, string> = {
  runtime: "Runtime",
  runtime_priority: "Runtime Priority",
  maintainer_access: "Maintainer Access",
  unsure: "Not sure yet",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { enquiryId } = await req.json();
    if (!enquiryId || typeof enquiryId !== "string") {
      return new Response(JSON.stringify({ error: "Missing enquiryId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: enquiry, error: enquiryError } = await serviceClient
      .from("runtime_enquiries")
      .select("id, service_provider_id, organization_name, contact_name, contact_email, tier, message")
      .eq("id", enquiryId)
      .maybeSingle();

    if (enquiryError || !enquiry) {
      return new Response(JSON.stringify({ error: "Enquiry not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: provider } = await serviceClient
      .from("service_providers")
      .select("slug")
      .eq("id", enquiry.service_provider_id)
      .maybeSingle();

    const { data: admins } = await serviceClient
      .from("provider_members")
      .select("user_id")
      .eq("service_provider_id", enquiry.service_provider_id)
      .in("role", ["owner", "admin"]);

    const recipientUserIds = (admins ?? []).map((a) => a.user_id);
    if (recipientUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const tierLabel = tierLabels[enquiry.tier] ?? enquiry.tier;
    const excerpt =
      enquiry.message.length > 240 ? `${enquiry.message.slice(0, 240)}…` : enquiry.message;

    const notifResponse = await fetch(`${supabaseUrl}/functions/v1/create-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        recipientUserIds,
        type: "runtime_enquiry",
        title: `New Valence Runtime enquiry — ${tierLabel}`,
        message: `${enquiry.contact_name} at ${enquiry.organization_name} (${enquiry.contact_email}): ${excerpt}`,
        payload: {
          enquiry_id: enquiry.id,
          tier: enquiry.tier,
          organization_name: enquiry.organization_name,
          contact_name: enquiry.contact_name,
          contact_email: enquiry.contact_email,
        },
        actionUrl: provider?.slug ? `/dashboard/provider/${provider.slug}/enquiries` : undefined,
      }),
    });

    const notifResult = await notifResponse.json();
    console.log("Runtime enquiry notification result:", notifResult);

    return new Response(JSON.stringify({ success: true, ...notifResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in notify-runtime-enquiry:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
