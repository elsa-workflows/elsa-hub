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
  refunded_amount_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  is_provider_created: boolean;
  stripe_payment_intent_id: string | null;
  receipt_url: string | null;
  invoice_number: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  lot_minutes_remaining: number | null;
  lot_minutes_purchased: number | null;
}

export function useProviderOrders(slug: string | undefined) {
  const { user } = useAuth();

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

  const ordersQuery = useQuery({
    queryKey: ["provider-orders", providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, organization_id, credit_bundle_id, status, amount_cents, refunded_amount_cents, currency, created_at, paid_at, created_by, stripe_payment_intent_id"
        )
        .eq("service_provider_id", providerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      const orgIds = [...new Set(orders.map((o) => o.organization_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      const orgMap = new Map(orgs?.map((o) => [o.id, o.name]) || []);

      const bundleIds = [...new Set(orders.map((o) => o.credit_bundle_id))];
      const { data: bundles } = await supabase
        .from("credit_bundles")
        .select("id, name, hours")
        .in("id", bundleIds);
      const bundleMap = new Map(
        bundles?.map((b) => [b.id, { name: b.name, hours: b.hours }]) || []
      );

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

      const orderIds = orders.map((o) => o.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("order_id, stripe_receipt_url, invoice_number, hosted_invoice_url, invoice_pdf_url")
        .in("order_id", orderIds);
      const invMap = new Map(invoices?.map((i) => [i.order_id as string, i]) || []);

      const { data: lots } = await supabase
        .from("credit_lots")
        .select("order_id, minutes_purchased, minutes_remaining")
        .in("order_id", orderIds);
      const lotMap = new Map(lots?.map((l) => [l.order_id as string, l]) || []);

      const providerMemberIds = new Set(teamQuery.data || []);

      return orders.map((order) => {
        const inv = invMap.get(order.id);
        const lot = lotMap.get(order.id);
        return {
          id: order.id,
          organization_id: order.organization_id,
          organization_name: orgMap.get(order.organization_id) || "Unknown",
          bundle_name: bundleMap.get(order.credit_bundle_id)?.name || "Unknown Bundle",
          bundle_hours: bundleMap.get(order.credit_bundle_id)?.hours || 0,
          status: order.status,
          amount_cents: order.amount_cents,
          refunded_amount_cents: order.refunded_amount_cents ?? 0,
          currency: order.currency,
          created_at: order.created_at,
          paid_at: order.paid_at,
          created_by: order.created_by,
          created_by_name: order.created_by ? profileMap.get(order.created_by) || null : null,
          is_provider_created: order.created_by ? providerMemberIds.has(order.created_by) : false,
          stripe_payment_intent_id: order.stripe_payment_intent_id ?? null,
          receipt_url: inv?.stripe_receipt_url ?? null,
          invoice_number: inv?.invoice_number ?? null,
          hosted_invoice_url: inv?.hosted_invoice_url ?? null,
          invoice_pdf_url: inv?.invoice_pdf_url ?? null,
          lot_minutes_remaining: lot?.minutes_remaining ?? null,
          lot_minutes_purchased: lot?.minutes_purchased ?? null,
        } as ProviderOrder;
      });
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

