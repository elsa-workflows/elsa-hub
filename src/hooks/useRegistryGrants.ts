import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ReconciliationReason =
  | "needs_issue"
  | "needs_revoke"
  | "expiry_drift"
  | "needs_reissue";

export interface ReconciliationRow {
  subscription_id: string | null;
  organization_id: string | null;
  organization_name: string | null;
  service_provider_id: string | null;
  product_id: string | null;
  product_name: string | null;
  tier: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  registry_grant_id: string | null;
  grant_status: string | null;
  registry_token_name: string | null;
  token_expires_at: string | null;
  reason: string | null;
}

export interface RegistryGrantRow {
  id: string;
  organization_id: string;
  subscription_id: string;
  registry_token_name: string;
  scope_map_name: string;
  status: "pending" | "active" | "revoked" | "expired";
  issued_at: string | null;
  token_expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  notes: string | null;
  created_at: string;
  organizations: { name: string; slug: string } | null;
  subscriptions: {
    products: { name: string; tier: string } | null;
  } | null;
}

export function useRegistryGrants(providerId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const reconciliation = useQuery({
    queryKey: ["registry-reconciliation", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("runtime_grant_reconciliation")
        .select("*")
        .eq("service_provider_id", providerId!);
      if (error) throw error;
      return (data ?? []) as ReconciliationRow[];
    },
    enabled: !!providerId,
  });

  const grants = useQuery({
    queryKey: ["registry-grants", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registry_grants")
        .select(
          "id, organization_id, subscription_id, registry_token_name, scope_map_name, status, issued_at, token_expires_at, revoked_at, revoked_reason, notes, created_at, organizations(name, slug), subscriptions(products(name, tier))"
        )
        .eq("service_provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RegistryGrantRow[];
    },
    enabled: !!providerId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["registry-grants", providerId] });
    queryClient.invalidateQueries({ queryKey: ["registry-reconciliation", providerId] });
  };

  const recordIssued = useMutation({
    mutationFn: async (input: {
      organization_id: string;
      subscription_id: string;
      registry_token_name: string;
      scope_map_name: string;
      token_expires_at: string;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("registry_grants").insert({
        service_provider_id: providerId!,
        organization_id: input.organization_id,
        subscription_id: input.subscription_id,
        registry_token_name: input.registry_token_name,
        scope_map_name: input.scope_map_name,
        token_expires_at: input.token_expires_at,
        notes: input.notes || null,
        status: "active",
        issued_at: new Date().toISOString(),
        issued_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Token recorded");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRevoked = useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("registry_grants")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_reason: input.reason,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grant marked revoked");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateExpiry = useMutation({
    mutationFn: async (input: { id: string; token_expires_at: string }) => {
      const { error } = await supabase
        .from("registry_grants")
        .update({ token_expires_at: input.token_expires_at })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Token expiry updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    reconciliation: reconciliation.data ?? [],
    grants: grants.data ?? [],
    isLoading: reconciliation.isLoading || grants.isLoading,
    recordIssued,
    markRevoked,
    updateExpiry,
  };
}
