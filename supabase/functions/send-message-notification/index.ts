import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const senderId = userData.user.id;

    const {
      conversationId,
      messageBody,
      senderContextType,
      organizationId,
      serviceProviderId,
    } = await req.json();

    if (!conversationId || !messageBody || !organizationId || !serviceProviderId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the conversation exists and matches provided IDs
    const { data: conv, error: convError } = await serviceClient
      .from("conversations")
      .select("id, organization_id, service_provider_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine recipients: members of the OTHER side
    let recipientUserIds: string[] = [];
    let senderEntityName = "";
    let recipientContextType: "org" | "provider";
    let recipientSlug = "";

    if (senderContextType === "org") {
      // Sender is org member, notify provider members
      recipientContextType = "provider";
      const { data: providerMembers } = await serviceClient
        .from("provider_members")
        .select("user_id")
        .eq("service_provider_id", conv.service_provider_id);
      recipientUserIds = (providerMembers || [])
        .map((m) => m.user_id)
        .filter((id) => id !== senderId);

      // Get org name for notification
      const { data: org } = await serviceClient
        .from("organizations")
        .select("name")
        .eq("id", conv.organization_id)
        .single();
      senderEntityName = org?.name || "An organization";

      // Get provider slug for action URL
      const { data: provider } = await serviceClient
        .from("service_providers")
        .select("slug")
        .eq("id", conv.service_provider_id)
        .single();
      recipientSlug = provider?.slug || "";
    } else {
      // Sender is provider member, notify org members
      recipientContextType = "org";
      const { data: orgMembers } = await serviceClient
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", conv.organization_id);
      recipientUserIds = (orgMembers || [])
        .map((m) => m.user_id)
        .filter((id) => id !== senderId);

      // Get provider name for notification
      const { data: provider } = await serviceClient
        .from("service_providers")
        .select("name")
        .eq("id", conv.service_provider_id)
        .single();
      senderEntityName = provider?.name || "A service provider";

      // Get org slug for action URL
      const { data: org } = await serviceClient
        .from("organizations")
        .select("slug")
        .eq("id", conv.organization_id)
        .single();
      recipientSlug = org?.slug || "";
    }

    if (recipientUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const actionUrl = `/dashboard/${recipientContextType}/${recipientSlug}/messages`;
    const truncatedBody =
      messageBody.length > 100 ? messageBody.substring(0, 100) + "..." : messageBody;

    // Call create-notification (internal, service-role auth)
    const notificationPayload = {
      recipientUserIds,
      type: "new_message",
      title: `New message from ${senderEntityName}`,
      message: truncatedBody,
      payload: {
        conversation_id: conversationId,
        sender_user_id: senderId,
        sender_context_type: senderContextType,
      },
      actionUrl,
    };

    const notifResponse = await fetch(
      `${supabaseUrl}/functions/v1/create-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(notificationPayload),
      }
    );

    const notifResult = await notifResponse.json();
    console.log("Notification result:", notifResult);

    return new Response(
      JSON.stringify({ success: true, ...notifResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-message-notification:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
