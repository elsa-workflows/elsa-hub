import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrgRegistryGrant {
  id: string;
  registry_token_name: string;
  scope_map_name: string;
  status: "pending" | "active" | "revoked" | "expired";
  issued_at: string | null;
  token_expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  subscription_id: string;
}

export interface OrgRuntimeSubscription {
  id: string;
  status: string;
  current_period_end: string | null;
  product_name: string;
  product_tier: string | null;
}

export interface OrgRegistryAccess {
  runtimeSubscriptions: OrgRuntimeSubscription[];
  grants: OrgRegistryGrant[];
}

/**
 * Registry access state for an organization: its runtime_subscription products
 * and any registry grants issued against them.
 *
 * NOTE: registry grants never contain a registry password — only the token name.
 * See RegistryAccessCard for why.
 */
export function useOrgRegistryAccess(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["org-registry-access", organizationId],
    queryFn: async (): Promise<OrgRegistryAccess> => {
      if (!organizationId) return { runtimeSubscriptions: [], grants: [] };

      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("id, status, current_period_end, product_id, products(name, tier, kind)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (subsError) throw subsError;

      const runtimeSubscriptions: OrgRuntimeSubscription[] = (subs ?? [])
        .filter((s) => {
          const p = s.products as { kind?: string } | null;
          return p?.kind === "runtime_subscription";
        })
        .map((s) => {
          const p = s.products as { name: string; tier: string | null };
          return {
            id: s.id,
            status: s.status,
            current_period_end: s.current_period_end,
            product_name: p?.name ?? "Runtime subscription",
            product_tier: p?.tier ?? null,
          };
        });

      if (runtimeSubscriptions.length === 0) return { runtimeSubscriptions: [], grants: [] };

      const { data: grants, error: grantsError } = await supabase
        .from("registry_grants")
        .select(
          "id, registry_token_name, scope_map_name, status, issued_at, token_expires_at, revoked_at, revoked_reason, subscription_id"
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (grantsError) throw grantsError;

      return {
        runtimeSubscriptions,
        grants: (grants ?? []) as OrgRegistryGrant[],
      };
    },
    enabled: !!organizationId,
  });
}
