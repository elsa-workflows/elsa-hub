import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProviderCustomer {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  created_at: string;
  available_minutes: number;
  total_minutes: number;
}

export interface ProviderWorkLog {
  id: string;
  organization_id: string;
  organization_name: string;
  performed_by: string;
  performer_name: string | null;
  performed_at: string;
  category: string;
  description: string;
  minutes_spent: number;
  is_billable: boolean;
  created_at: string;
}

export interface ProviderBundle {
  id: string;
  name: string;
  description: string | null;
  hours: number;
  monthly_hours: number | null;
  price_cents: number;
  currency: string;
  billing_type: "one_time" | "recurring";
  recurring_interval: string | null;
  is_active: boolean;
  stripe_price_id: string | null;
  created_at: string;
}

export function useProviderDashboard(slug: string | undefined) {
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

  // Check if current user is admin
  const isAdminQuery = useQuery({
    queryKey: ["is-provider-admin", providerId],
    queryFn: async () => {
      if (!providerId) return false;
      
      const { data, error } = await supabase.rpc("is_provider_admin", {
        p_provider_id: providerId,
      });
      
      if (error) return false;
      return data === true;
    },
    enabled: !!providerId && !!user,
  });

  // Fetch customers (organizations)
  const customersQuery = useQuery({
    queryKey: ["provider-customers", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data: customers, error } = await supabase
        .from("provider_customers")
        .select("id, organization_id, created_at")
        .eq("service_provider_id", providerId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      if (!customers || customers.length === 0) return [];

      // Fetch organization details
      const orgIds = customers.map(c => c.organization_id);
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .in("id", orgIds);
      
      const orgMap = new Map(orgs?.map(o => [o.id, o]) || []);

      // Fetch credit balances for each org
      const balancePromises = orgIds.map(async (orgId) => {
        const { data } = await supabase.rpc("get_credit_balance", { p_org_id: orgId });
        const providerBalance = data?.find((b: { service_provider_id: string }) => b.service_provider_id === providerId);
        return {
          orgId,
          available_minutes: providerBalance?.available_minutes || 0,
          total_minutes: providerBalance?.total_minutes || 0,
        };
      });
      
      const balances = await Promise.all(balancePromises);
      const balanceMap = new Map(balances.map(b => [b.orgId, b]));

      return customers.map(customer => ({
        id: customer.id,
        organization_id: customer.organization_id,
        organization_name: orgMap.get(customer.organization_id)?.name || "Unknown",
        organization_slug: orgMap.get(customer.organization_id)?.slug || "",
        created_at: customer.created_at,
        available_minutes: balanceMap.get(customer.organization_id)?.available_minutes || 0,
        total_minutes: balanceMap.get(customer.organization_id)?.total_minutes || 0,
      }));
    },
    enabled: !!providerId,
  });

  // Fetch work logs
  const workLogsQuery = useQuery({
    queryKey: ["provider-work-logs", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data: logs, error } = await supabase
        .from("work_logs")
        .select("id, organization_id, performed_by, performed_at, category, description, minutes_spent, is_billable, created_at")
        .eq("service_provider_id", providerId)
        .order("performed_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Fetch organization names
      const orgIds = [...new Set(logs.map(l => l.organization_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      const orgMap = new Map(orgs?.map(o => [o.id, o.name]) || []);

      // Fetch performer names
      const performerIds = [...new Set(logs.map(l => l.performed_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", performerIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.email]) || []);

      return logs.map(log => ({
        ...log,
        organization_name: orgMap.get(log.organization_id) || "Unknown",
        performer_name: profileMap.get(log.performed_by) || null,
      }));
    },
    enabled: !!providerId,
  });

  // Fetch bundles
  const bundlesQuery = useQuery({
    queryKey: ["provider-bundles", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data, error } = await supabase
        .from("credit_bundles")
        .select("*")
        .eq("service_provider_id", providerId)
        .order("price_cents", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });

  // Fetch team members
  const teamMembersQuery = useQuery({
    queryKey: ["provider-team", providerId],
    queryFn: async () => {
      if (!providerId) return [];
      
      const { data: members, error } = await supabase
        .from("provider_members")
        .select("id, user_id, role, created_at")
        .eq("service_provider_id", providerId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      if (!members || members.length === 0) return [];

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
    enabled: !!providerId,
  });

  const isLoading = 
    providerQuery.isLoading || 
    customersQuery.isLoading || 
    workLogsQuery.isLoading ||
    bundlesQuery.isLoading;

  return {
    provider: providerQuery.data || null,
    customers: customersQuery.data || [],
    workLogs: workLogsQuery.data || [],
    bundles: bundlesQuery.data || [],
    teamMembers: teamMembersQuery.data || [],
    isAdmin: isAdminQuery.data === true,
    isLoading,
    notFound: !providerQuery.isLoading && !providerQuery.data,
  };
}
