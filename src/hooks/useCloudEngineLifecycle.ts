import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  cloudClient,
  isCloudTerminalOperationState,
  isCloudUpdating,
  type CloudActivityItem,
  type CloudAvailableRelease,
  type CloudBffResponse,
  type CloudProvisioningProgress,
} from "@/lib/cloudClient";

const POLL_MS = 5_000;

function isBusyStatus(status: string) {
  return status === "Provisioning" || status === "Updating" || status === "Deleting";
}

export function useCloudEngineLifecycle(
  workspaceId: string | undefined,
  engineId: string | undefined,
  status: string | undefined,
  updating: boolean,
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(workspaceId && engineId && !updating);
  const poll = enabled && Boolean(status && isBusyStatus(status));

  const progressQuery = useQuery({
    queryKey: ["cloud", "progress", workspaceId, engineId],
    queryFn: () => cloudClient.invoke({
      action: "provisioningProgress",
      workspaceId: workspaceId!,
      engineId: engineId!,
    }),
    enabled,
    refetchInterval: poll ? POLL_MS : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const activityQuery = useQuery({
    queryKey: ["cloud", "activity", workspaceId, engineId],
    queryFn: () => cloudClient.invoke({
      action: "engineActivity",
      workspaceId: workspaceId!,
      engineId: engineId!,
    }),
    enabled,
    staleTime: 15_000,
    retry: false,
  });

  const releasesQuery = useQuery({
    queryKey: ["cloud", "releases", workspaceId, engineId],
    queryFn: () => cloudClient.invoke({
      action: "availableReleases",
      workspaceId: workspaceId!,
      engineId: engineId!,
    }),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  const progress = progressQuery.data && progressQuery.data.ok && "progress" in progressQuery.data
    ? progressQuery.data.progress
    : undefined;
  const activity = activityQuery.data && activityQuery.data.ok && "items" in activityQuery.data
    ? activityQuery.data.items
    : [];
  const releases = releasesQuery.data && releasesQuery.data.ok && "releases" in releasesQuery.data
    ? releasesQuery.data.releases
    : [];

  async function refreshEngine() {
    await queryClient.invalidateQueries({ queryKey: ["cloud", "engines"] });
    await queryClient.invalidateQueries({ queryKey: ["cloud", "onboarding"] });
  }

  const restart = useMutation({
    mutationFn: (input: { idempotencyKey: string; ifMatch: string }) => {
      if (updating) return Promise.resolve(updatingResponse());
      return cloudClient.invoke({
        action: "restartEngine",
        workspaceId: workspaceId!,
        engineId: engineId!,
        ...input,
      });
    },
    onSuccess: refreshEngine,
  });

  const applyRelease = useMutation({
    mutationFn: (input: { version: string; idempotencyKey: string; ifMatch: string }) => {
      if (updating) return Promise.resolve(updatingResponse());
      return cloudClient.invoke({
        action: "applyRelease",
        workspaceId: workspaceId!,
        engineId: engineId!,
        ...input,
      });
    },
    onSuccess: refreshEngine,
  });

  const confirmDelete = useMutation({
    mutationFn: () => {
      if (updating) return Promise.resolve(updatingResponse());
      return cloudClient.invoke({
        action: "confirmDelete",
        workspaceId: workspaceId!,
        engineId: engineId!,
      });
    },
  });

  const deleteEngine = useMutation({
    mutationFn: (input: {
      deleteConfirmationId: string;
      idempotencyKey: string;
      ifMatch: string;
    }) => {
      if (updating) return Promise.resolve(updatingResponse());
      return cloudClient.invoke({
        action: "deleteEngine",
        workspaceId: workspaceId!,
        engineId: engineId!,
        ...input,
      });
    },
  });

  const openStudio = useMutation({
    mutationFn: (input: {
      organizationId: string;
      audience: string;
      redirectUri: string;
      codeChallenge: string;
    }) => {
      if (updating) return Promise.resolve(updatingResponse());
      return cloudClient.invoke({
        action: "issueStudioHandoff",
        engineId: engineId!,
        ...input,
      });
    },
  });

  return {
    progress: progress as CloudProvisioningProgress | undefined,
    activity: activity as CloudActivityItem[],
    releases: releases as CloudAvailableRelease[],
    restart: restart.mutateAsync,
    applyRelease: applyRelease.mutateAsync,
    confirmDelete: confirmDelete.mutateAsync,
    deleteEngine: deleteEngine.mutateAsync,
    openStudio: openStudio.mutateAsync,
    restarting: restart.isPending,
    applying: applyRelease.isPending,
    deleting: confirmDelete.isPending || deleteEngine.isPending,
    openingStudio: openStudio.isPending,
    pollDeleteOperation: async (operationId: string) => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const result = await cloudClient.invoke({
          action: "deleteOperationStatus",
          workspaceId: workspaceId!,
          engineId: engineId!,
          operationId,
        });
        if (isCloudUpdating(result)) return result;
        if (result.ok && "operation" in result && isCloudTerminalOperationState(result.operation.state)) {
          await refreshEngine();
          return result;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
      return {
        ok: false as const,
        code: "invalid_request" as const,
        error: "Delete did not reach a terminal state.",
      };
    },
  };
}

function updatingResponse(): CloudBffResponse {
  return {
    ok: false,
    state: "updating",
    code: CLOUD_UPDATING_CODE,
    error: CLOUD_UPDATING_MESSAGE,
  };
}
