import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Public product catalogue row (safe for anonymous visitors). */
export interface PublicProduct {
  id: string;
  service_provider_id: string;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  price_cents: number;
  currency: string;
  recurring_interval: string;
  triage_response_business_days: number | null;
  includes_backports: boolean;
  slot_limit: number | null;
  /** True when the product has a payment price configured and can be bought online. */
  is_purchasable: boolean;
}

/**
 * Active products for a given service provider slug, readable anonymously.
 * The page's purchasability state is derived entirely from these rows.
 */
export function useRuntimeProducts(providerSlug: string) {
  return useQuery({
    queryKey: ["products-public", providerSlug],
    queryFn: async (): Promise<PublicProduct[]> => {
      const { data: provider, error: providerError } = await supabase
        .from("service_providers")
        .select("id")
        .eq("slug", providerSlug)
        .maybeSingle();

      if (providerError) throw providerError;
      if (!provider) return [];

      const { data, error } = await supabase
        .from("products_public" as never)
        .select(
          "id, service_provider_id, name, slug, tier, description, price_cents, currency, recurring_interval, triage_response_business_days, includes_backports, slot_limit, is_purchasable"
        )
        .eq("service_provider_id", provider.id)
        .order("price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as PublicProduct[];
    },
  });
}
