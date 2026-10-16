import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cloudClient,
  isCloudBffError,
  CLOUD_LIMIT_MESSAGE,
  CLOUD_UPDATING_MESSAGE,
  isCloudLimitReached,
  isCloudUpdating,
  type CloudBffResponse,
  type CloudEngineCreateIntent,
  type CloudEngineSummary,
  type CloudOnboardingOptions,
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

export async function fetchCloudOnboardingOptions(workspaceId: string): Promise<CloudBffResponse> {
  return cloudClient.invoke({ action: "onboardingOptions", workspaceId });
}

export function useCloudEngines() {
  const workspace = useCloudWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace.view.kind === "ready" ? workspace.view.workspace.id : undefined;
  const updating = workspace.view.kind === "updating";

  const query = useQuery({
    queryKey: ["cloud", "engines", workspaceId],
    queryFn: () => fetchCloudEngines(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    retry: false,
  });

  const view = resolveCloudEngineListView(
    workspace.view,
    query.data,
    Boolean(workspaceId) && (query.isPending || query.data === undefined),
  );

  const optionsQuery = useQuery({
    queryKey: ["cloud", "onboarding", workspaceId],
    queryFn: () => fetchCloudOnboardingOptions(workspaceId!),
    enabled: Boolean(workspaceId) && !updating && view.kind !== "updating",
    staleTime: 15_000,
    retry: false,
  });

  const atLimit = Boolean(optionsQuery.data && isCloudLimitReached(optionsQuery.data));
  const options = optionsQuery.data && optionsQuery.data.ok && "options" in optionsQuery.data
    ? optionsQuery.data.options
    : undefined;
  const canCreate = Boolean(workspaceId && options && !atLimit && !updating && view.kind !== "updating");

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      slug: string;
      intent: CloudEngineCreateIntent;
      idempotencyKey: string;
    }): Promise<CloudBffResponse> => {
      if (!workspaceId) {
        return { ok: false as const, code: "invalid_request" as const, error: "A workspace id is required." };
      }
      if (updating || view.kind === "updating") {
        return {
          ok: false as const,
          state: "updating" as const,
          code: "control_update_in_progress" as const,
          error: CLOUD_UPDATING_MESSAGE,
        };
      }
      if (atLimit && optionsQuery.data && isCloudLimitReached(optionsQuery.data)) {
        return optionsQuery.data;
      }
      if (atLimit) {
        return {
          ok: false as const,
          code: "instance_limit_reached" as const,
          error: CLOUD_LIMIT_MESSAGE,
        };
      }
      return cloudClient.invoke({
        action: "createEngine",
        workspaceId,
        ...input,
      });
    },
    onSuccess: async (result) => {
      if (!result.ok) return;
      await queryClient.invalidateQueries({ queryKey: ["cloud", "engines"] });
      await queryClient.invalidateQueries({ queryKey: ["cloud", "onboarding"] });
    },
  });

  return {
    ...query,
    view,
    options: options as CloudOnboardingOptions | undefined,
    atLimit,
    canCreate,
    createEngine: create.mutateAsync,
    creating: create.isPending,
    workspaces: workspace.workspaces,
    selectWorkspace: workspace.selectWorkspace,
    selectedWorkspace: workspace.view.kind === "ready" ? workspace.view.workspace : undefined,
    setupCloud: workspace.setupCloud,
    setupPending: workspace.setupPending,
    refetch: async () => {
      await workspace.refetch();
      if (workspaceId) {
        await Promise.all([query.refetch(), optionsQuery.refetch()]);
      }
    },
  };
}
