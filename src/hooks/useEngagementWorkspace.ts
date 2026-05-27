import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceCounterparty {
  workspace_id: string | null;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  service_provider_id: string;
  service_provider_name: string;
  service_provider_slug: string;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  session_id: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  description: string | null;
  uploaded_by: string;
  uploader_name: string | null;
  created_at: string;
}

const BUCKET = "engagement-files";

/**
 * Resolve (and create on first access) the workspace for one org-provider pair.
 */
export function useEngagementWorkspace(
  organizationId: string | undefined,
  serviceProviderId: string | undefined,
) {
  return useQuery({
    queryKey: ["engagement-workspace", organizationId, serviceProviderId],
    queryFn: async () => {
      if (!organizationId || !serviceProviderId) return null;
      const { data, error } = await supabase.rpc(
        "get_or_create_engagement_workspace",
        { p_org_id: organizationId, p_provider_id: serviceProviderId },
      );
      if (error) throw error;
      return data as string;
    },
    enabled: !!organizationId && !!serviceProviderId,
  });
}

/**
 * List all counterparties (workspaces) for an organization.
 */
export function useOrgWorkspaceList(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["org-workspace-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data: customers, error } = await supabase
        .from("provider_customers")
        .select("service_provider_id")
        .eq("organization_id", organizationId);
      if (error) throw error;
      if (!customers?.length) return [];

      const providerIds = customers.map((c) => c.service_provider_id);
      const { data: providers } = await supabase
        .from("service_providers")
        .select("id, name, slug, logo_url")
        .in("id", providerIds);

      const { data: workspaces } = await supabase
        .from("engagement_workspaces")
        .select("id, organization_id, service_provider_id")
        .eq("organization_id", organizationId)
        .in("service_provider_id", providerIds);

      const workspaceMap = new Map(
        workspaces?.map((w) => [w.service_provider_id, w.id]) || [],
      );

      return (providers || []).map((p) => ({
        provider_id: p.id,
        provider_name: p.name,
        provider_slug: p.slug,
        provider_logo_url: p.logo_url,
        workspace_id: workspaceMap.get(p.id) || null,
      }));
    },
    enabled: !!organizationId,
  });
}

/**
 * List all counterparties (workspaces) for a service provider.
 */
export function useProviderWorkspaceList(serviceProviderId: string | undefined) {
  return useQuery({
    queryKey: ["provider-workspace-list", serviceProviderId],
    queryFn: async () => {
      if (!serviceProviderId) return [];
      const { data: customers, error } = await supabase
        .from("provider_customers")
        .select("organization_id")
        .eq("service_provider_id", serviceProviderId);
      if (error) throw error;
      if (!customers?.length) return [];

      const orgIds = customers.map((c) => c.organization_id);
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .in("id", orgIds);

      const { data: workspaces } = await supabase
        .from("engagement_workspaces")
        .select("id, organization_id, service_provider_id")
        .eq("service_provider_id", serviceProviderId)
        .in("organization_id", orgIds);

      const workspaceMap = new Map(
        workspaces?.map((w) => [w.organization_id, w.id]) || [],
      );

      return (orgs || []).map((o) => ({
        organization_id: o.id,
        organization_name: o.name,
        organization_slug: o.slug,
        organization_logo_url: o.logo_url,
        workspace_id: workspaceMap.get(o.id) || null,
      }));
    },
    enabled: !!serviceProviderId,
  });
}

/**
 * Files inside a workspace + upload / delete / signed URL helpers.
 */
export function useWorkspaceFiles(
  workspaceId: string | undefined,
  options?: { sessionId?: string | null },
) {
  const queryClient = useQueryClient();
  const sessionFilter = options?.sessionId; // undefined = no filter, null = root only, string = that session

  const filesQuery = useQuery({
    queryKey: ["workspace-files", workspaceId, sessionFilter ?? "__all__"],
    queryFn: async (): Promise<WorkspaceFile[]> => {
      if (!workspaceId) return [];
      let q = supabase
        .from("workspace_files")
        .select("id, workspace_id, session_id, storage_path, file_name, mime_type, size_bytes, description, uploaded_by, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (sessionFilter === null) q = q.is("session_id", null);
      else if (typeof sessionFilter === "string") q = q.eq("session_id", sessionFilter);
      const { data, error } = await q;
      if (error) throw error;
      if (!data?.length) return [];

      const uploaderIds = [...new Set(data.map((f) => f.uploaded_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", uploaderIds);
      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p.display_name || p.email]) || [],
      );

      return data.map((f) => ({
        ...f,
        uploader_name: profileMap.get(f.uploaded_by) || null,
      }));
    },
    enabled: !!workspaceId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description?: string }) => {
      if (!workspaceId) throw new Error("Workspace not loaded");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${workspaceId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("workspace_files").insert({
        workspace_id: workspaceId,
        session_id: typeof sessionFilter === "string" ? sessionFilter : null,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        description: description?.trim() || null,
        uploaded_by: user.id,
      });

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-files", workspaceId] });
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async (file: WorkspaceFile) => {
      await supabase.storage.from(BUCKET).remove([file.storage_path]);
      const { error } = await supabase.from("workspace_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-files", workspaceId] });
    },
  });

  const getSignedUrl = async (storagePath: string, download = false) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 300, download ? { download: true } : undefined);
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    files: filesQuery.data || [],
    isLoading: filesQuery.isLoading,
    refetch: filesQuery.refetch,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    remove: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    getSignedUrl,
  };
}
