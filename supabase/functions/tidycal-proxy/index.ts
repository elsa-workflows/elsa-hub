import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIDYCAL_API_BASE = "https://tidycal.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await serviceClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, provider_id, org_id, mode, page } = body;

    if (!provider_id) {
      return new Response(
        JSON.stringify({ error: "provider_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify access: caller must be provider member OR org member who is a customer
    const { data: isProviderMember } = await userClient.rpc(
      "is_provider_member",
      { p_provider_id: provider_id }
    );
    let isOrgMember = false;
    if (org_id) {
      const { data: orgMemberCheck } = await userClient.rpc("is_org_member", {
        p_org_id: org_id,
      });
      isOrgMember = !!orgMemberCheck;
    }

    if (!isProviderMember && !isOrgMember) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If org caller, verify they are a customer of this provider
    if (isOrgMember && !isProviderMember && org_id) {
      const { data: customerCheck } = await serviceClient
        .from("provider_customers")
        .select("id")
        .eq("organization_id", org_id)
        .eq("service_provider_id", provider_id)
        .maybeSingle();

      if (!customerCheck) {
        return new Response(
          JSON.stringify({ error: "Organization is not a customer of this provider" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get the provider's TidyCal token
    const { data: integration } = await serviceClient
      .from("provider_integrations")
      .select("tidycal_api_token")
      .eq("service_provider_id", provider_id)
      .maybeSingle();

    const tidycalToken = integration?.tidycal_api_token;
    if (!tidycalToken) {
      return new Response(
        JSON.stringify({
          error: "TidyCal integration not configured for this provider",
          code: "NOT_CONFIGURED",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tidycalHeaders = {
      Authorization: `Bearer ${tidycalToken}`,
      Accept: "application/json",
    };

    if (action === "list-booking-types") {
      const resp = await fetch(`${TIDYCAL_API_BASE}/booking-types`, {
        headers: tidycalHeaders,
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("TidyCal API error:", resp.status, errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch booking types from TidyCal" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const data = await resp.json();
      const bookingTypes = (data.data || [])
        .filter(
          (bt: any) =>
            !bt.title?.toLowerCase().includes("introductory") &&
            !bt.title?.toLowerCase().includes("intro ")
        )
        .map((bt: any) => ({
          id: bt.id,
          title: bt.title,
          description: bt.description,
          duration: bt.duration,
          price: bt.price,
          currency: bt.currency,
          url: bt.url,
          is_active: bt.is_active,
        }));

      return new Response(JSON.stringify({ booking_types: bookingTypes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-bookings") {
      const now = new Date();
      // TidyCal requires Y-m-d\TH:i:s\Z format (no milliseconds)
      const nowFormatted = now.toISOString().replace(/\.\d{3}Z$/, "Z");
      const params = new URLSearchParams();
      if (page) params.set("page", String(page));

      if (mode === "upcoming") {
        params.set("starts_at", nowFormatted);
      } else if (mode === "past") {
        params.set("ends_at", nowFormatted);
      }

      // Don't filter cancelled by default — let the frontend show status
      const resp = await fetch(
        `${TIDYCAL_API_BASE}/bookings?${params.toString()}`,
        { headers: tidycalHeaders }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("TidyCal bookings API error:", resp.status, errText);
        return new Response(
          JSON.stringify({ error: "Failed to fetch bookings from TidyCal" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const data = await resp.json();
      let bookings = (data.data || []).map((b: any) => ({
        id: b.id,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        cancelled: b.cancelled,
        cancel_reason: b.cancel_reason,
        contact_name: b.contact?.name,
        contact_email: b.contact?.email,
        booking_type_title: b.booking_type?.title,
        booking_type_duration: b.booking_type?.duration,
        answers: b.answers,
      }));

      // For org callers, filter bookings by org contact email or member emails
      if (isOrgMember && !isProviderMember && org_id) {
        // Get org contact email and member emails
        const { data: org } = await serviceClient
          .from("organizations")
          .select("contact_email")
          .eq("id", org_id)
          .single();

        const { data: orgMembers } = await serviceClient
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", org_id);

        const memberUserIds = (orgMembers || []).map((m: any) => m.user_id);
        const { data: memberProfiles } = await serviceClient
          .from("profiles")
          .select("email")
          .in("user_id", memberUserIds);

        const orgEmails = new Set<string>();
        if (org?.contact_email) orgEmails.add(org.contact_email.toLowerCase());
        (memberProfiles || []).forEach((p: any) => {
          if (p.email) orgEmails.add(p.email.toLowerCase());
        });

        bookings = bookings.filter(
          (b: any) =>
            b.contact_email && orgEmails.has(b.contact_email.toLowerCase())
        );
      }

      return new Response(
        JSON.stringify({
          bookings,
          pagination: data.meta || null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("tidycal-proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
