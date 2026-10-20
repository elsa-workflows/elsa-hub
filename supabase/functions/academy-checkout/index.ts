import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleAcademyCheckoutRequest } from "./handler.ts";

serve((req) =>
  handleAcademyCheckoutRequest(req, async (authHeader) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !stripeSecret) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase or Stripe secrets" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2025-08-27.basil",
    });

    return {
      userClient,
      serviceClient,
      stripe,
    };
  })
);
