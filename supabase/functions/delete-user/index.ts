import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  cleanupStripeCustomersForUserDelete,
  type ServiceClient,
  StripeCustomerDeleteError,
} from "./cleanup.ts";
import {
  createSupabaseStripeRefStore,
  livemodeFromStripeSecretKey,
  type StripeRefClient,
} from "./stripe_customer_refs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client for permission checks
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller's JWT and get their user ID using service client
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerUserId = user.id;

    // Verify caller is platform admin
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_platform_admin");
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Access denied: Platform admin required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userId === callerUserId) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = profile.email;
    const stripeWarnings: string[] = [];

    // Stripe cleanup uses stored refs only. Never look up customers by email.
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2024-06-20",
        httpClient: Stripe.createFetchHttpClient(),
      });
      const livemode = livemodeFromStripeSecretKey(stripeSecretKey);
      // The supabase-js builders satisfy the narrow structural types the
      // cleanup uses; their generics are not assignable to them directly.
      const refs = createSupabaseStripeRefStore(
        serviceClient as unknown as StripeRefClient,
      );

      try {
        const { warnings } = await cleanupStripeCustomersForUserDelete({
          serviceClient: serviceClient as unknown as ServiceClient,
          stripe,
          refs,
          userId,
          livemode,
        });
        stripeWarnings.push(...warnings);
      } catch (stripeErr) {
        if (stripeErr instanceof StripeCustomerDeleteError) {
          console.error("Stripe customer delete failed:", stripeErr);
          return new Response(
            JSON.stringify({ error: stripeErr.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw stripeErr;
      }
    } else {
      stripeWarnings.push("Stripe not configured - skipped Stripe cleanup");
    }

    // Call the database RPC to delete all user data
    // Use userClient so auth.uid() is available for is_platform_admin() check in the RPC
    const { data: result, error: rpcError } = await userClient.rpc("admin_delete_user", {
      p_user_id: userId,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: `Database deletion failed: ${rpcError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedUser: userEmail,
        ...result,
        stripeWarnings: stripeWarnings.length > 0 ? stripeWarnings : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
