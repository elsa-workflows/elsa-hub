import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shouldEnsureCloudOrganizationLink } from "@/lib/cloud/organizationLink";

export const CLOUD_ORGANIZATION_LINK_QUERY_KEY = ["cloud", "organization-link"] as const;

export async function fetchCloudOrganizationLink(hubOrganizationId: string) {
  const { data, error } = await supabase
    .from("cloud_organization_links")
    .select("hub_organization_id, control_organization_id, validated_at")
    .eq("hub_organization_id", hubOrganizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useCloudOrganizationLink(hubOrganizationId: string | undefined) {
  return useQuery({
    queryKey: [...CLOUD_ORGANIZATION_LINK_QUERY_KEY, hubOrganizationId],
    queryFn: () => fetchCloudOrganizationLink(hubOrganizationId!),
    enabled: Boolean(hubOrganizationId),
    staleTime: 30_000,
    retry: false,
  });
}

export function useEnsureCloudOrganizationLink(input: {
  hubOrganizationId?: string;
  isOrgAdmin: boolean;
  setupCloud: (hubOrganizationId?: string) => void;
  setupPending: boolean;
}) {
  const { hubOrganizationId, isOrgAdmin, setupCloud, setupPending } = input;
  const link = useCloudOrganizationLink(hubOrganizationId);
  const attemptedForOrg = useRef<string | null>(null);

  const shouldPersist = shouldEnsureCloudOrganizationLink({
    hubOrganizationId,
    isOrgAdmin,
    linkLoading: Boolean(hubOrganizationId) && (link.isPending || link.isFetching),
    linked: Boolean(link.data),
    persistPending: setupPending,
    alreadyAttempted: attemptedForOrg.current === hubOrganizationId,
  });

  useEffect(() => {
    if (!shouldPersist || !hubOrganizationId) return;
    attemptedForOrg.current = hubOrganizationId;
    setupCloud(hubOrganizationId);
  }, [hubOrganizationId, setupCloud, shouldPersist]);
}
