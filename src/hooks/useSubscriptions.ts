import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  organization_id: string;
  service_provider_id: string;
  credit_bundle_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  bundle_name: string;
  monthly_hours: number;
}

export function useSubscriptions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["subscriptions", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!subscriptions || subscriptions.length === 0) return [];

      // Fetch bundle info
      const bundleIds = [...new Set(subscriptions.map(s => s.credit_bundle_id))];
      const { data: bundles } = await supabase
        .from("credit_bundles")
        .select("id, name, monthly_hours")
        .in("id", bundleIds);
      
      const bundleMap = new Map(bundles?.map(b => [b.id, { name: b.name, monthly_hours: b.monthly_hours }]) || []);

      return subscriptions.map(sub => ({
        ...sub,
        bundle_name: bundleMap.get(sub.credit_bundle_id)?.name || "Unknown",
        monthly_hours: bundleMap.get(sub.credit_bundle_id)?.monthly_hours || 0,
      })) as Subscription[];
    },
    enabled: !!organizationId,
  });
}
