import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CreditBundle {
  id: string;
  name: string;
  hours: number;
  price_cents: number;
  currency: string;
  description: string | null;
  stripe_price_id: string | null;
  service_provider_id: string;
}

export function useCreditBundles() {
  return useQuery({
    queryKey: ["credit-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_bundles")
        .select("id, name, hours, price_cents, currency, description, stripe_price_id, service_provider_id")
        .eq("is_active", true)
        .order("hours", { ascending: true });

      if (error) throw error;
      return data as CreditBundle[];
    },
  });
}
