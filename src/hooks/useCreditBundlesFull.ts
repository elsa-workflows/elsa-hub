import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Full bundle data including sensitive fields (for authenticated purchase flow)
export interface CreditBundleFull {
  id: string;
  name: string;
  hours: number;
  price_cents: number;
  currency: string;
  description: string | null;
  stripe_price_id: string | null;
  service_provider_id: string;
  billing_type: "one_time" | "recurring";
  recurring_interval: string | null;
  monthly_hours: number | null;
  recommended_monthly_minutes: number | null;
  monthly_consumption_cap_minutes: number | null;
  priority_level: "standard" | "priority";
}

/**
 * Fetches full bundle data including stripe_price_id.
 * Only works for authenticated users due to RLS policies.
 * Use this for purchase flows where you need to check if a bundle is configured.
 */
export function useCreditBundlesFull() {
  return useQuery({
    queryKey: ["credit-bundles-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_bundles")
        .select("id, name, hours, price_cents, currency, description, stripe_price_id, service_provider_id, billing_type, recurring_interval, monthly_hours, recommended_monthly_minutes, monthly_consumption_cap_minutes, priority_level")
        .eq("is_active", true)
        .order("billing_type", { ascending: true })
        .order("hours", { ascending: true });

      if (error) throw error;
      return data as CreditBundleFull[];
    },
  });
}
