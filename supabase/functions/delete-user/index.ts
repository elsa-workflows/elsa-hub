import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

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

    // Fetch user email
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

    // Stripe cleanup
    if (stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-08-27.basil",
        httpClient: Stripe.createFetchHttpClient(),
      });

      try {
        // Get sole-owner organization IDs
        const { data: soleOwnerOrgs } = await serviceClient
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .eq("role", "owner");

        if (soleOwnerOrgs && soleOwnerOrgs.length > 0) {
          const orgIds = soleOwnerOrgs.map((o) => o.organization_id);

          // Check which are actually sole-owner (no other owners)
          const { data: otherOwners } = await serviceClient
            .from("organization_members")
            .select("organization_id")
            .in("organization_id", orgIds)
            .neq("user_id", userId)
            .eq("role", "owner");

          const orgsWithOtherOwners = new Set(otherOwners?.map((o) => o.organization_id) || []);
          const soleOwnerOrgIds = orgIds.filter((id) => !orgsWithOtherOwners.has(id));

          if (soleOwnerOrgIds.length > 0) {
            // Cancel active subscriptions for these orgs
            const { data: subs } = await serviceClient
              .from("subscriptions")
              .select("stripe_subscription_id")
              .in("organization_id", soleOwnerOrgIds)
              .eq("status", "active");

            if (subs) {
              for (const sub of subs) {
                try {
                  await stripe.subscriptions.cancel(sub.stripe_subscription_id, {
                    invoice_now: true,
                    prorate: true,
                  });
                  console.log(`Canceled Stripe subscription: ${sub.stripe_subscription_id}`);
                } catch (stripeErr) {
                  console.error(`Failed to cancel subscription ${sub.stripe_subscription_id}:`, stripeErr);
                  stripeWarnings.push(`Failed to cancel subscription: ${sub.stripe_subscription_id}`);
                }
              }
            }
          }
        }

        // Delete Stripe customers by email
        const customers = await stripe.customers.list({ email: userEmail, limit: 100 });
        for (const customer of customers.data) {
          try {
            await stripe.customers.del(customer.id);
            console.log(`Deleted Stripe customer: ${customer.id}`);
          } catch (stripeErr) {
            console.error(`Failed to delete customer ${customer.id}:`, stripeErr);
            stripeWarnings.push(`Failed to delete Stripe customer: ${customer.id}`);
          }
        }
      } catch (stripeErr) {
        console.error("Stripe cleanup error:", stripeErr);
        stripeWarnings.push("Partial Stripe cleanup failure - check logs");
      }
    } else {
      stripeWarnings.push("Stripe not configured - skipped Stripe cleanup");
    }

    // Call the database RPC to delete all user data
    const { data: result, error: rpcError } = await serviceClient.rpc("admin_delete_user", {
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
