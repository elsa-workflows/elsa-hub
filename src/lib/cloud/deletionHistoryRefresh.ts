import { cloudClient } from "@/lib/cloudClient";
import { deletionCompletedAt, isCloudUpdating, type CloudBffResponse } from "@/lib/cloud";
import {
  forgetControlDeletionState,
  readDeletionHistory,
  readPersistedDeletionHistory,
  removeDeletionHistoryRecord,
  upsertDeletionHistoryRecord,
} from "@/lib/cloud/deletionHistoryStore";
import type { DeletionHistoryRecord } from "@/lib/cloud/managedEngineDeletionHistory";

export type DeletionStatusInvoker = (body: {
  action: "deleteOperationStatus";
  workspaceId: string;
  engineId: string;
  operationId: string;
}) => Promise<CloudBffResponse>;

export async function refreshDeletionHistoryFromControl(
  workspaceId: string,
  invoke: DeletionStatusInvoker = (body) => cloudClient.invoke(body),
): Promise<DeletionHistoryRecord[]> {
  const pointers = readPersistedDeletionHistory(workspaceId);

  for (const pointer of pointers) {
    if (!pointer.operationId) {
      forgetControlDeletionState(workspaceId, pointer.instanceId);
      continue;
    }

    const result = await invoke({
      action: "deleteOperationStatus",
      workspaceId,
      engineId: pointer.instanceId,
      operationId: pointer.operationId,
    });

    if (isCloudUpdating(result) || !result.ok || !("operation" in result)) {
      if (!isCloudUpdating(result) && result.ok === false && result.code === "not_found") {
        removeDeletionHistoryRecord(workspaceId, pointer.instanceId);
        continue;
      }
      forgetControlDeletionState(workspaceId, pointer.instanceId);
      continue;
    }

    upsertDeletionHistoryRecord(workspaceId, {
      phase: "tracking",
      instanceId: pointer.instanceId,
      instanceName: pointer.instanceName,
      operationId: pointer.operationId,
      acceptedAt: result.operation.acceptedAt ?? pointer.acceptedAt,
      completedAt: deletionCompletedAt(result.operation, null),
      state: result.operation.state,
      lastOperation: {
        action: result.operation.action,
        state: result.operation.state,
        completedAt: result.operation.completedAt,
      },
    });
  }

  return readDeletionHistory(workspaceId);
}
