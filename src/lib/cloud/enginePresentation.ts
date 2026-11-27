import {
  CLOUD_HEALTH_HEALTHY,
  CLOUD_HEALTH_NOT_RESPONDING,
  CLOUD_STATUS_NOT_FULLY_HEALTHY,
} from "@/lib/cloudClient/signedCopy";
import type { CloudEngineOverview } from "@/lib/cloud/actions";
import { isCloudSignedCopyEnabled } from "@/lib/cloudClient/signedCopyFlag";

export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const SETUP_FAILURE_ACTIONS = new Set(["Create", "Retry"]);
const ALWAYS_HIDDEN_HEALTH_STATUSES = new Set(["Deleted", "Deleting"]);
const SIGNED_HIDDEN_HEALTH_STATUSES = new Set(["Provisioning", "Failed"]);
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
  lastOperation?: { action?: string | null } | null,
): boolean {
  if (status !== "Failed") return false;
  const action = lastOperation?.action;
  return Boolean(action && SETUP_FAILURE_ACTIONS.has(action));
}

export function shouldHideHealth(status?: string | null, health?: string | null): boolean {
  if (status && ALWAYS_HIDDEN_HEALTH_STATUSES.has(status)) return true;
  if (!isCloudSignedCopyEnabled()) return false;
  if (status && SIGNED_HIDDEN_HEALTH_STATUSES.has(status)) return true;
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
