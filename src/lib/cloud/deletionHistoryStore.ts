import {
  capStoredDeletionRecords,
  type DeletionHistoryRecord,
} from "@/lib/cloud/managedEngineDeletionHistory";

const STORAGE_PREFIX = "elsa-hub.cloud.deletion-history.";

export function deletionHistoryStorageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

export function readDeletionHistory(workspaceId: string): DeletionHistoryRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(deletionHistoryStorageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return capStoredDeletionRecords(parsed.filter(isDeletionHistoryRecord));
  } catch {
    return [];
  }
}

export function writeDeletionHistory(workspaceId: string, records: DeletionHistoryRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    deletionHistoryStorageKey(workspaceId),
    JSON.stringify(capStoredDeletionRecords(records)),
  );
}

export function upsertDeletionHistoryRecord(
  workspaceId: string,
  record: DeletionHistoryRecord,
): DeletionHistoryRecord[] {
  const next = readDeletionHistory(workspaceId).filter((item) => item.instanceId !== record.instanceId);
  next.push(record);
  const capped = capStoredDeletionRecords(next);
  writeDeletionHistory(workspaceId, capped);
  return capped;
}

function isDeletionHistoryRecord(value: unknown): value is DeletionHistoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as DeletionHistoryRecord;
  return (record.phase === "submitting" || record.phase === "tracking") &&
    typeof record.instanceId === "string" &&
    record.instanceId.length > 0;
}
