import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProviderOrder {
  id: string;
  organization_id: string;
  organization_name: string;
  bundle_name: string;
  bundle_hours: number;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  is_provider_created: boolean;
  receipt_url: string | null;
}

export function useProviderOrders(slug: string | undefined) {
  const { user } = useAuth();

  // Fetch provider by slug
  const providerQuery = useQuery({
    queryKey: ["provider", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const providerId = providerQuery.data?.id;

  // Fetch provider team member user IDs (to determine if order was created by provider)
  const teamQuery = useQuery({
    queryKey: ["provider-team-ids", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      const { data, error } = await supabase
        .from("provider_members")
        .select("user_id")
        .eq("service_provider_id", providerId);

      if (error) throw error;
      return data?.map((m) => m.user_id) || [];
    },
    enabled: !!providerId,
  });

  // Fetch orders
  const ordersQuery = useQuery({
    queryKey: ["provider-orders", providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, organization_id, credit_bundle_id, status, amount_cents, currency, created_at, paid_at, created_by")
        .eq("service_provider_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      // Fetch organization names
      const orgIds = [...new Set(orders.map((o) => o.organization_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      const orgMap = new Map(orgs?.map((o) => [o.id, o.name]) || []);

      // Fetch bundle info
      const bundleIds = [...new Set(orders.map((o) => o.credit_bundle_id))];
      const { data: bundles } = await supabase
        .from("credit_bundles")
        .select("id, name, hours")
        .in("id", bundleIds);
      const bundleMap = new Map(bundles?.map((b) => [b.id, { name: b.name, hours: b.hours }]) || []);

      // Fetch creator profiles
      const creatorIds = [...new Set(orders.map((o) => o.created_by).filter(Boolean))] as string[];
      const { data: profiles } = creatorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, email")
            .in("user_id", creatorIds)
        : { data: [] };
      const profileMap = new Map<string, string>(
        profiles?.map((p) => [p.user_id, p.display_name || p.email || "Unknown"] as [string, string]) || []
      );

      // Fetch invoices for receipt URLs
      const orderIds = orders.map((o) => o.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("order_id, stripe_receipt_url")
        .in("order_id", orderIds);
      const receiptMap = new Map<string, string | null>(
        invoices?.map((i) => [i.order_id as string, i.stripe_receipt_url] as [string, string | null]) || []
      );

      // Provider team member IDs (from teamQuery)
      const providerMemberIds = new Set(teamQuery.data || []);

      return orders.map((order) => ({
        id: order.id,
        organization_id: order.organization_id,
        organization_name: orgMap.get(order.organization_id) || "Unknown",
        bundle_name: bundleMap.get(order.credit_bundle_id)?.name || "Unknown Bundle",
        bundle_hours: bundleMap.get(order.credit_bundle_id)?.hours || 0,
        status: order.status,
        amount_cents: order.amount_cents,
        currency: order.currency,
        created_at: order.created_at,
        paid_at: order.paid_at,
        created_by: order.created_by,
        created_by_name: order.created_by ? profileMap.get(order.created_by) || null : null,
        is_provider_created: order.created_by ? providerMemberIds.has(order.created_by) : false,
        receipt_url: receiptMap.get(order.id) || null,
      }));
    },
    enabled: !!providerId && !!teamQuery.data,
  });

  const isLoading = providerQuery.isLoading || ordersQuery.isLoading || teamQuery.isLoading;

  return {
    provider: providerQuery.data || null,
    orders: ordersQuery.data || [],
    isLoading,
    notFound: !providerQuery.isLoading && !providerQuery.data,
    refetch: () => ordersQuery.refetch(),
  };
}
