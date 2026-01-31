import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminOverviewStats() {
  return useQuery({
    queryKey: ["admin-overview-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_overview_stats");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useAdminUsers(limit = 50, offset = 0, search?: string) {
  return useQuery({
    queryKey: ["admin-users", limit, offset, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_users", {
        p_limit: limit,
        p_offset: offset,
        p_search: search || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminOrganizations(limit = 50, offset = 0, search?: string) {
  return useQuery({
    queryKey: ["admin-organizations", limit, offset, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_organizations", {
        p_limit: limit,
        p_offset: offset,
        p_search: search || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminOrders(limit = 50, offset = 0, status?: string) {
  return useQuery({
    queryKey: ["admin-orders", limit, offset, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_orders", {
        p_limit: limit,
        p_offset: offset,
        p_status: status || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminInvitations(limit = 50, offset = 0, status?: string) {
  return useQuery({
    queryKey: ["admin-invitations", limit, offset, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_invitations", {
        p_limit: limit,
        p_offset: offset,
        p_status: status || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminAuditEvents(limit = 50, offset = 0, entityType?: string) {
  return useQuery({
    queryKey: ["admin-audit-events", limit, offset, entityType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_audit_events", {
        p_limit: limit,
        p_offset: offset,
        p_entity_type: entityType || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}
