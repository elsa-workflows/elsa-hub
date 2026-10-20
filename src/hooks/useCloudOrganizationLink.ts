import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  cloudOrganizationLinkView,
  type CloudOrganizationLinkView,
} from "@/lib/cloud/organizationLink";

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

export function useCloudOrganizationLinkView(
  hubOrganizationId: string | undefined,
  isOrgAdmin: boolean,
): CloudOrganizationLinkView & { refetch: () => void } {
  const link = useCloudOrganizationLink(hubOrganizationId);
  return {
    ...cloudOrganizationLinkView({
      hubOrganizationId,
      isOrgAdmin,
      linkLoading: Boolean(hubOrganizationId) && (link.isPending || link.isFetching),
      linked: Boolean(link.data),
      linkError: Boolean(hubOrganizationId) && link.isError,
    }),
    refetch: () => {
      void link.refetch();
    },
  };
}
