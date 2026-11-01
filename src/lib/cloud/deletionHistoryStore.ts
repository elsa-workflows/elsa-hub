import {
  capStoredDeletionRecords,
  type DeletionHistoryRecord,
} from "@/lib/cloud/managedEngineDeletionHistory";

const STORAGE_PREFIX = "elsa-hub.cloud.deletion-history.";
const submittingByWorkspace = new Map<string, DeletionHistoryRecord[]>();

export function deletionHistoryStorageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

export function isControlAcceptedDeletionRecord(record: DeletionHistoryRecord): boolean {
  return record.phase === "tracking" && (Boolean(record.acceptedAt) || Boolean(record.state));
}

function readSubmitting(workspaceId: string): DeletionHistoryRecord[] {
  return [...(submittingByWorkspace.get(workspaceId) ?? [])];
}

function persistAccepted(workspaceId: string, records: DeletionHistoryRecord[]): DeletionHistoryRecord[] {
  const accepted = capStoredDeletionRecords(records.filter(isControlAcceptedDeletionRecord));
  if (typeof localStorage === "undefined") return accepted;
  localStorage.setItem(deletionHistoryStorageKey(workspaceId), JSON.stringify(accepted));
  return accepted;
}

export function readPersistedDeletionHistory(workspaceId: string): DeletionHistoryRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(deletionHistoryStorageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return capStoredDeletionRecords(
      parsed.filter(isDeletionHistoryRecord).filter(isControlAcceptedDeletionRecord),
    );
  } catch {
    return [];
  }
}

export function readDeletionHistory(workspaceId: string): DeletionHistoryRecord[] {
  const persisted = readPersistedDeletionHistory(workspaceId);
  const submitting = readSubmitting(workspaceId).filter(
    (row) => !persisted.some((item) => item.instanceId === row.instanceId),
  );
  return capStoredDeletionRecords([...persisted, ...submitting]);
}

export function writeDeletionHistory(workspaceId: string, records: DeletionHistoryRecord[]): void {
  persistAccepted(workspaceId, records);
}

export function upsertSubmittingDeletionRecord(
  workspaceId: string,
  record: Omit<DeletionHistoryRecord, "phase"> & { phase?: DeletionHistoryRecord["phase"] },
): DeletionHistoryRecord[] {
  const next = readSubmitting(workspaceId).filter((item) => item.instanceId !== record.instanceId);
  next.push({ ...record, phase: "submitting" });
  submittingByWorkspace.set(workspaceId, next);
  return readDeletionHistory(workspaceId);
}

export function removeDeletionHistoryRecord(
  workspaceId: string,
  instanceId: string,
): DeletionHistoryRecord[] {
  submittingByWorkspace.set(
    workspaceId,
    readSubmitting(workspaceId).filter((item) => item.instanceId !== instanceId),
  );
  persistAccepted(
    workspaceId,
    readPersistedDeletionHistory(workspaceId).filter((item) => item.instanceId !== instanceId),
  );
  return readDeletionHistory(workspaceId);
}

export function upsertDeletionHistoryRecord(
  workspaceId: string,
  record: DeletionHistoryRecord,
): DeletionHistoryRecord[] {
  if (record.phase === "submitting" || !isControlAcceptedDeletionRecord(record)) {
    return upsertSubmittingDeletionRecord(workspaceId, record);
  }
  submittingByWorkspace.set(
    workspaceId,
    readSubmitting(workspaceId).filter((item) => item.instanceId !== record.instanceId),
  );
  const next = readPersistedDeletionHistory(workspaceId).filter((item) => item.instanceId !== record.instanceId);
  next.push(record);
  persistAccepted(workspaceId, next);
  return readDeletionHistory(workspaceId);
}

export function resetDeletionHistoryStore(): void {
  submittingByWorkspace.clear();
}

function isDeletionHistoryRecord(value: unknown): value is DeletionHistoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as DeletionHistoryRecord;
  return (record.phase === "submitting" || record.phase === "tracking") &&
    typeof record.instanceId === "string" &&
    record.instanceId.length > 0;
}
