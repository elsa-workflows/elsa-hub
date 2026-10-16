import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hasCloudSetupMarker } from "@/lib/cloudClient";

export function useOwnedHubProducts(organizationId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const ownsCloud = Boolean(userId && hasCloudSetupMarker(userId));

  const academyQuery = useQuery({
    queryKey: ["hub-products", "academy", organizationId, userId],
    enabled: Boolean(userId && organizationId),
    staleTime: 60_000,
    queryFn: async () => {
      const [entitlements, seats] = await Promise.all([
        supabase
          .from("academy_entitlements")
          .select("id")
          .is("revoked_at", null)
          .or(
            [
              organizationId ? `organization_id.eq.${organizationId}` : "",
              userId ? `user_id.eq.${userId}` : "",
            ]
              .filter(Boolean)
              .join(","),
          )
          .limit(1),
        supabase
          .from("academy_seat_assignments")
          .select("id")
          .eq("user_id", userId!)
          .limit(1),
      ]);

      if (entitlements.error) throw entitlements.error;
      if (seats.error) throw seats.error;
      return (entitlements.data?.length ?? 0) > 0 || (seats.data?.length ?? 0) > 0;
    },
  });

  const ownsAcademy = Boolean(academyQuery.data);

  return {
    ownsCloud,
    ownsAcademy,
    ownsNothing: !ownsCloud && !ownsAcademy,
    academyLoading: academyQuery.isLoading,
  };
}

/**
 * Org sidebar Products > Elsa Cloud and the Overview Cloud card share this
 * rule. A new browser has no localStorage setup marker (`ownsCloud` is false)
 * and the Cloud view is `needsSetup` — keep Cloud reachable in that state.
 */
export function shouldShowOrgCloudNav(): boolean {
  return true;
}
