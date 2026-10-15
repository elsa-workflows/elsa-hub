import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cloudClient,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudWorkspace,
} from "@/lib/cloudClient";

export const CLOUD_WORKSPACE_QUERY_KEY = ["cloud", "workspaces"] as const;
export const CLOUD_WORKSPACE_STALE_TIME = 5 * 60_000;

export type CloudWorkspaceView =
  | { kind: "loading" }
  | { kind: "updating"; message: string }
  | { kind: "needsSetup" }
  | { kind: "ready"; workspace: CloudWorkspace }
  | { kind: "error"; message: string };

export async function fetchCloudWorkspaces(): Promise<CloudBffResponse> {
  return cloudClient.invoke({ action: "listWorkspaces" });
}

export function cloudWorkspaceView(
  result: CloudBffResponse | undefined,
  isPending: boolean,
): CloudWorkspaceView {
  if (isPending || result === undefined) {
    return { kind: "loading" };
  }
  if (isCloudUpdating(result)) {
    return { kind: "updating", message: result.error };
  }
  if (isCloudBffError(result)) {
    return { kind: "error", message: result.error };
  }
  if ("workspaces" in result) {
    const workspace = result.workspaces[0];
    if (!workspace) return { kind: "needsSetup" };
    return { kind: "ready", workspace };
  }
  return { kind: "error", message: "Unexpected cloud-bff response." };
}

export function useCloudWorkspace() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CLOUD_WORKSPACE_QUERY_KEY,
    queryFn: fetchCloudWorkspaces,
    staleTime: CLOUD_WORKSPACE_STALE_TIME,
    retry: false,
  });

  const bootstrap = useMutation({
    mutationFn: () => cloudClient.invoke({ action: "bootstrap" }),
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: CLOUD_WORKSPACE_QUERY_KEY });
      }
    },
  });

  let view = cloudWorkspaceView(query.data, query.isPending);
  if (bootstrap.isPending) {
    view = { kind: "loading" };
  } else if (bootstrap.data && !bootstrap.data.ok) {
    view = isCloudUpdating(bootstrap.data)
      ? { kind: "updating", message: bootstrap.data.error }
      : {
          kind: "error",
          message: isCloudBffError(bootstrap.data)
            ? bootstrap.data.error
            : "Could not set up Elsa Cloud.",
        };
  }

  return {
    ...query,
    view,
    setupCloud: () => bootstrap.mutate(),
    setupPending: bootstrap.isPending,
    refetch: async () => {
      bootstrap.reset();
      return query.refetch();
    },
  };
}
