import {
  CLOUD_HEALTH_HEALTHY,
  CLOUD_HEALTH_NOT_RESPONDING,
  CLOUD_STATUS_NOT_FULLY_HEALTHY,
} from "@/lib/cloudClient/signedCopy";
import type { CloudEngineOverview, CloudLastOperation } from "@/lib/cloud/actions";

export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const SETUP_FAILURE_ACTIONS = new Set(["Create", "Retry"]);
const HIDDEN_HEALTH_STATUSES = new Set(["Deleted", "Deleting", "Provisioning", "Failed"]);
const SHOWN_HEALTH_VALUES: Record<string, string> = {
  Healthy: CLOUD_HEALTH_HEALTHY,
  Degraded: CLOUD_STATUS_NOT_FULLY_HEALTHY,
  Unreachable: CLOUD_HEALTH_NOT_RESPONDING,
};

export function usableOperationId(value?: string | null): string | null {
  const id = value?.trim() ?? "";
  if (!id || id.toLowerCase() === EMPTY_GUID) return null;
  return id;
}

export function isSetupFailure(
  status?: string | null,
  lastOperation?: Pick<CloudLastOperation, "action"> | null,
): boolean {
  if (status !== "Failed") return false;
  const action = lastOperation?.action;
  return Boolean(action && SETUP_FAILURE_ACTIONS.has(action));
}

export function shouldHideHealth(status?: string | null, health?: string | null): boolean {
  if (status && HIDDEN_HEALTH_STATUSES.has(status)) return true;
  return !health || !(health in SHOWN_HEALTH_VALUES);
}

export function cloudHealthLabel(health: string): string | null {
  return SHOWN_HEALTH_VALUES[health] ?? null;
}

export function partitionCloudEngines<T extends { status: string }>(engines: readonly T[]): {
  live: T[];
  deleted: T[];
} {
  const live: T[] = [];
  const deleted: T[] = [];
  for (const engine of engines) {
    if (engine.status === "Deleted") deleted.push(engine);
    else live.push(engine);
  }
  return { live, deleted };
}

export function deletedOperationId(engine: Pick<CloudEngineOverview, "lastOperation" | "activeOperation">): string | null {
  const last = engine.lastOperation;
  if (last && last.action === "Delete") {
    // lastOperation has no id on the Hub type; callers also pass activeOperation
  }
  return usableOperationId(engine.activeOperation?.id);
}

export function deletedCompletedAt(
  engine: Pick<CloudEngineOverview, "lastOperation">,
  localCompletedAt?: string | null,
): string | null {
  const last = engine.lastOperation;
  if (last?.action === "Delete" && last.state === "Succeeded" && last.completedAt) {
    return last.completedAt;
  }
  return localCompletedAt ?? null;
}
