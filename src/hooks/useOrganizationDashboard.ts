import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreditBalance {
  service_provider_id: string;
  provider_name: string;
  total_minutes: number;
  used_minutes: number;
  available_minutes: number;
  expiring_soon_minutes: number;
}

export interface OrderWithBundle {
  id: string;
  created_at: string;
  status: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  bundle_name: string;
  bundle_hours: number;
  receipt_url: string | null;
}

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  display_name: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  status: string;
}

export interface OrganizationDashboardData {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
  creditBalances: CreditBalance[];
  orders: OrderWithBundle[];
  teamMembers: TeamMember[];
  pendingInvitations: PendingInvitation[];
  isAdmin: boolean;
}

export function useOrganizationDashboard(slug: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch organization by slug
  const organizationQuery = useQuery({
    queryKey: ["organization", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const orgId = organizationQuery.data?.id;

  // Fetch credit balance via RPC
  const creditBalanceQuery = useQuery({
    queryKey: ["credit-balance", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data: balances, error: balanceError } = await supabase
        .rpc("get_credit_balance", { p_org_id: orgId });
      
      if (balanceError) throw balanceError;
      
      if (!balances || balances.length === 0) return [];

      // Fetch provider names
      const providerIds = balances.map((b: { service_provider_id: string }) => b.service_provider_id);
      const { data: providers } = await supabase
        .from("service_providers")
        .select("id, name")
        .in("id", providerIds);
      
      const providerMap = new Map(providers?.map(p => [p.id, p.name]) || []);
      
      return balances.map((b: {
        service_provider_id: string;
        total_minutes: number;
        used_minutes: number;
        available_minutes: number;
        expiring_soon_minutes: number;
      }) => ({
        ...b,
        provider_name: providerMap.get(b.service_provider_id) || "Unknown Provider",
      }));
    },
    enabled: !!orgId,
  });

  // Fetch orders with bundle info
  const ordersQuery = useQuery({
    queryKey: ["orders", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          status,
          amount_cents,
          currency,
          paid_at,
          credit_bundle_id
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      
      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      // Fetch bundle info
      const bundleIds = [...new Set(orders.map(o => o.credit_bundle_id))];
      const { data: bundles } = await supabase
        .from("credit_bundles")
        .select("id, name, hours")
        .in("id", bundleIds);
      
      const bundleMap = new Map(bundles?.map(b => [b.id, { name: b.name, hours: b.hours }]) || []);

      // Fetch invoices for receipt URLs
      const orderIds = orders.map(o => o.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("order_id, stripe_receipt_url")
        .in("order_id", orderIds);
      
      const invoiceMap = new Map(invoices?.map(i => [i.order_id, i.stripe_receipt_url]) || []);

      return orders.map(order => ({
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        amount_cents: order.amount_cents,
        currency: order.currency,
        paid_at: order.paid_at,
        bundle_name: bundleMap.get(order.credit_bundle_id)?.name || "Unknown Bundle",
        bundle_hours: bundleMap.get(order.credit_bundle_id)?.hours || 0,
        receipt_url: invoiceMap.get(order.id) || null,
      }));
    },
    enabled: !!orgId,
  });

  // Fetch team members with profile info
  const teamMembersQuery = useQuery({
    queryKey: ["team-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data: members, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      if (!members || members.length === 0) return [];

      // Fetch profiles for all members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return members.map(member => ({
        ...member,
        email: profileMap.get(member.user_id)?.email || null,
        display_name: profileMap.get(member.user_id)?.display_name || null,
      }));
    },
    enabled: !!orgId,
  });

  // Check if current user is admin
  const isAdminQuery = useQuery({
    queryKey: ["is-org-admin", orgId],
    queryFn: async () => {
      if (!orgId) return false;
      
      const { data, error } = await supabase.rpc("is_org_admin", {
        p_org_id: orgId,
      });
      
      if (error) return false;
      return data === true;
    },
    enabled: !!orgId && !!user,
  });

  // Fetch pending invitations (only if admin)
  // Uses secure view that masks emails from admins who didn't create the invitation
  const invitationsQuery = useQuery({
    queryKey: ["pending-invitations", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("invitations_secure")
        .select("id, email, role, expires_at, status")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching invitations:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!orgId && isAdminQuery.data === true,
  });

  const isLoading = 
    organizationQuery.isLoading || 
    creditBalanceQuery.isLoading || 
    ordersQuery.isLoading || 
    teamMembersQuery.isLoading;

  const error = 
    organizationQuery.error || 
    creditBalanceQuery.error || 
    ordersQuery.error || 
    teamMembersQuery.error;

  const refetchInvitations = () => {
    queryClient.invalidateQueries({ queryKey: ["pending-invitations", orgId] });
  };

  return {
    organization: organizationQuery.data || null,
    creditBalances: creditBalanceQuery.data || [],
    orders: ordersQuery.data || [],
    teamMembers: teamMembersQuery.data || [],
    pendingInvitations: invitationsQuery.data || [],
    isAdmin: isAdminQuery.data === true,
    isLoading,
    error,
    notFound: !organizationQuery.isLoading && !organizationQuery.data,
    refetchInvitations,
  };
}
