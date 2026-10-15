import { useQuery } from "@tanstack/react-query";
import {
  cloudClient,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudEngineOverview,
} from "@/lib/cloudClient";
import { useCloudWorkspace, type CloudWorkspaceView } from "./useCloudWorkspace";

export type CloudEngineOverviewView =
  | { kind: "loading" }
  | { kind: "updating"; message: string }
  | { kind: "needsSetup" }
  | { kind: "ready"; engine: CloudEngineOverview }
  | { kind: "missing" }
  | { kind: "error"; message: string };

export function cloudEngineOverviewView(
  result: CloudBffResponse | undefined,
  isPending: boolean,
): CloudEngineOverviewView {
  if (isPending || result === undefined) {
    return { kind: "loading" };
  }
  if (isCloudUpdating(result)) {
    return { kind: "updating", message: result.error };
  }
  if (isCloudBffError(result)) {
    if (result.code === "not_found") return { kind: "missing" };
    return { kind: "error", message: result.error };
  }
  if ("engine" in result) {
    return { kind: "ready", engine: result.engine };
  }
  return { kind: "error", message: "Unexpected cloud-bff response." };
}

export function resolveCloudEngineOverviewView(
  workspace: CloudWorkspaceView,
  overview: CloudBffResponse | undefined,
  overviewPending: boolean,
): CloudEngineOverviewView {
  switch (workspace.kind) {
    case "loading":
    case "updating":
    case "error":
    case "needsSetup":
      return workspace;
    case "ready":
      return cloudEngineOverviewView(overview, overviewPending);
  }
}

export async function fetchCloudEngineOverview(
  workspaceId: string,
  engineId: string,
): Promise<CloudBffResponse> {
  return cloudClient.invoke({
    action: "engineOverview",
    workspaceId,
    engineId,
  });
}

export function useCloudEngineOverview(engineId: string | undefined) {
  const workspace = useCloudWorkspace();
  const workspaceId = workspace.view.kind === "ready" ? workspace.view.workspace.id : undefined;

  const query = useQuery({
    queryKey: ["cloud", "engines", workspaceId, engineId],
    queryFn: () => fetchCloudEngineOverview(workspaceId!, engineId!),
    enabled: Boolean(workspaceId && engineId),
    staleTime: 30_000,
    retry: false,
  });

  const waitingForEngine = Boolean(workspaceId && engineId) &&
    (query.isPending || query.data === undefined);

  return {
    ...query,
    view: resolveCloudEngineOverviewView(workspace.view, query.data, waitingForEngine || !engineId),
    workspaces: workspace.workspaces,
    selectWorkspace: workspace.selectWorkspace,
    selectedWorkspace: workspace.view.kind === "ready" ? workspace.view.workspace : undefined,
    setupCloud: workspace.setupCloud,
    setupPending: workspace.setupPending,
    refetch: async () => {
      await workspace.refetch();
      if (workspaceId && engineId) await query.refetch();
    },
  };
}
