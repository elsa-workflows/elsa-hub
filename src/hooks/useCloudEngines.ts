import { useQuery } from "@tanstack/react-query";
import {
  cloudClient,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudEngineSummary,
} from "@/lib/cloudClient";
import { useCloudWorkspace, type CloudWorkspaceView } from "./useCloudWorkspace";

export type CloudEngineListView =
  | { kind: "loading" }
  | { kind: "updating"; message: string }
  | { kind: "needsSetup" }
  | { kind: "empty" }
  | { kind: "list"; engines: CloudEngineSummary[] }
  | { kind: "error"; message: string };

export function cloudEngineListView(
  result: CloudBffResponse | undefined,
  isPending: boolean,
): CloudEngineListView {
  if (isPending || result === undefined) {
    return { kind: "loading" };
  }
  if (isCloudUpdating(result)) {
    return { kind: "updating", message: result.error };
  }
  if (isCloudBffError(result)) {
    return { kind: "error", message: result.error };
  }
  if ("engines" in result) {
    if (result.state === "empty" || result.engines.length === 0) {
      return { kind: "empty" };
    }
    return { kind: "list", engines: result.engines };
  }
  return { kind: "error", message: "Unexpected cloud-bff response." };
}

export function resolveCloudEngineListView(
  workspace: CloudWorkspaceView,
  engines: CloudBffResponse | undefined,
  enginesPending: boolean,
): CloudEngineListView {
  switch (workspace.kind) {
    case "loading":
    case "updating":
    case "error":
    case "needsSetup":
      return workspace;
    case "ready":
      return cloudEngineListView(engines, enginesPending);
  }
}

export async function fetchCloudEngines(workspaceId: string): Promise<CloudBffResponse> {
  return cloudClient.invoke({ action: "listEngines", workspaceId });
}

export function useCloudEngines() {
  const workspace = useCloudWorkspace();
  const workspaceId = workspace.view.kind === "ready" ? workspace.view.workspace.id : undefined;

  const query = useQuery({
    queryKey: ["cloud", "engines", workspaceId],
    queryFn: () => fetchCloudEngines(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    retry: false,
  });

  return {
    ...query,
    view: resolveCloudEngineListView(
      workspace.view,
      query.data,
      Boolean(workspaceId) && (query.isPending || query.data === undefined),
    ),
    setupCloud: workspace.setupCloud,
    setupPending: workspace.setupPending,
    refetch: async () => {
      await workspace.refetch();
      if (workspaceId) await query.refetch();
    },
  };
}
