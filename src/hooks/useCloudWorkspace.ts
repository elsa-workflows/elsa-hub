import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  cloudClient,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudWorkspace,
} from "@/lib/cloudClient";
import {
  forgetCloudSetupIfUserGone,
  hasCloudSetupMarker,
  setCloudSetupMarker,
} from "@/lib/cloudClient/setupMarker";
import { selectPreferredCloudWorkspace } from "@/lib/cloudClient/workspace";

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
    const workspace = selectPreferredCloudWorkspace(result.workspaces);
    if (!workspace) return { kind: "needsSetup" };
    return { kind: "ready", workspace };
  }
  return { kind: "error", message: "Unexpected cloud-bff response." };
}

export function useCloudWorkspace() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [setupReady, setSetupReady] = useState(() =>
    Boolean(userId && hasCloudSetupMarker(userId)),
  );

  useEffect(() => {
    setSetupReady(Boolean(userId && hasCloudSetupMarker(userId)));
  }, [userId]);

  const canLoad = Boolean(userId && setupReady);
  const query = useQuery({
    queryKey: [...CLOUD_WORKSPACE_QUERY_KEY, userId],
    queryFn: fetchCloudWorkspaces,
    enabled: canLoad,
    staleTime: CLOUD_WORKSPACE_STALE_TIME,
    retry: false,
  });

  useEffect(() => {
    if (!userId || !query.data) return;
    if (forgetCloudSetupIfUserGone(userId, query.data, "listWorkspaces")) {
      setSetupReady(false);
    }
  }, [query.data, userId]);

  const bootstrap = useMutation({
    mutationFn: () => cloudClient.invoke({ action: "bootstrap" }),
    onSuccess: (result) => {
      if (!result.ok) {
        if (userId) {
          forgetCloudSetupIfUserGone(userId, result, "bootstrap");
        }
        return;
      }
      if (userId) {
        setCloudSetupMarker(userId);
        setSetupReady(true);
      }
      void queryClient.invalidateQueries({ queryKey: CLOUD_WORKSPACE_QUERY_KEY });
    },
  });

  let view: CloudWorkspaceView = !canLoad
    ? { kind: "needsSetup" }
    : cloudWorkspaceView(query.data, query.isPending || query.data === undefined);
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
      if (!canLoad) return;
      return query.refetch();
    },
  };
}
