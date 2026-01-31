import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Public bundle data (safe for anonymous users)
export interface CreditBundle {
  id: string;
  name: string;
  hours: number;
  price_cents: number;
  currency: string;
  description: string | null;
  billing_type: "one_time" | "recurring";
  recurring_interval: string | null;
  monthly_hours: number | null;
  priority_level: "standard" | "priority";
}

export function useCreditBundles() {
  return useQuery({
    queryKey: ["credit-bundles-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_bundles_public")
        .select("id, name, hours, price_cents, currency, description, billing_type, recurring_interval, monthly_hours, priority_level")
        .order("billing_type", { ascending: true })
        .order("hours", { ascending: true });

      if (error) throw error;
      return data as CreditBundle[];
    },
  });
}
