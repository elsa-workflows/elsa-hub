import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrgAuditEvent {
  id: string;
  actor_type: "user" | "system";
  actor_display_name: string;
  entity_type: string;
  action: string;
  summary: string;
  created_at: string;
}

interface UseOrgAuditEventsOptions {
  limit?: number;
  offset?: number;
  entityType?: string | null;
}

export function useOrgAuditEvents(
  orgId: string | undefined,
  options: UseOrgAuditEventsOptions = {}
) {
  const { limit = 50, offset = 0, entityType = null } = options;

  return useQuery({
    queryKey: ["org-audit-events", orgId, limit, offset, entityType],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc("get_org_audit_events", {
        p_org_id: orgId,
        p_limit: limit,
        p_offset: offset,
        p_entity_type: entityType,
      });

      if (error) {
        // Access denied is expected for non-admins - return empty array
        if (error.message.includes("Access denied")) {
          return [];
        }
        throw error;
      }

      return (data as OrgAuditEvent[]) || [];
    },
    enabled: !!orgId,
  });
}
