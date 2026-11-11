import {
  capStoredDeletionRecords,
  type DeletionHistoryRecord,
} from "@/lib/cloud/managedEngineDeletionHistory";

const STORAGE_PREFIX = "elsa-hub.cloud.deletion-history.";
const submittingByWorkspace = new Map<string, DeletionHistoryRecord[]>();
const controlByWorkspace = new Map<string, DeletionHistoryRecord[]>();

export function deletionHistoryStorageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

/** A row Control accepted, identified so later loads can refresh status. */
export function isControlAcceptedDeletionRecord(record: DeletionHistoryRecord): boolean {
  return record.phase === "tracking" && Boolean(record.operationId || record.acceptedAt);
}

export function toPersistedDeletionPointer(
  record: DeletionHistoryRecord,
): DeletionHistoryRecord | null {
  if (!isControlAcceptedDeletionRecord(record)) return null;
  return {
    phase: "tracking",
    instanceId: record.instanceId,
    instanceName: record.instanceName,
    operationId: record.operationId,
    acceptedAt: record.acceptedAt,
  };
}

function readSubmitting(workspaceId: string): DeletionHistoryRecord[] {
  return [...(submittingByWorkspace.get(workspaceId) ?? [])];
}

function readControlSnapshots(workspaceId: string): DeletionHistoryRecord[] {
  return [...(controlByWorkspace.get(workspaceId) ?? [])];
}

function persistPointers(workspaceId: string, records: DeletionHistoryRecord[]): DeletionHistoryRecord[] {
  const pointers = capStoredDeletionRecords(
    records.map(toPersistedDeletionPointer).filter((row): row is DeletionHistoryRecord => row !== null),
  );
  if (typeof localStorage === "undefined") return pointers;
  localStorage.setItem(deletionHistoryStorageKey(workspaceId), JSON.stringify(pointers));
  return pointers;
}

function writeControlSnapshots(workspaceId: string, records: DeletionHistoryRecord[]): void {
  controlByWorkspace.set(
    workspaceId,
    records.filter((record) => record.phase === "tracking" && Boolean(record.state)),
  );
}

export function readPersistedDeletionHistory(workspaceId: string): DeletionHistoryRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(deletionHistoryStorageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const pointers = capStoredDeletionRecords(
      parsed
        .filter(isDeletionHistoryRecord)
        .map(toPersistedDeletionPointer)
        .filter((row): row is DeletionHistoryRecord => row !== null),
    );
    localStorage.setItem(deletionHistoryStorageKey(workspaceId), JSON.stringify(pointers));
    return pointers;
  } catch {
    return [];
  }
}

export function readDeletionHistory(workspaceId: string): DeletionHistoryRecord[] {
  const persisted = readPersistedDeletionHistory(workspaceId);
  const snapshots = readControlSnapshots(workspaceId);
  const submitting = readSubmitting(workspaceId);
  const rows: DeletionHistoryRecord[] = [];
  const seen = new Set<string>();

  for (const snapshot of snapshots) {
    rows.push(snapshot);
    seen.add(snapshot.instanceId);
  }
  for (const pointer of persisted) {
    if (seen.has(pointer.instanceId)) continue;
    rows.push(pointer);
    seen.add(pointer.instanceId);
  }
  for (const row of submitting) {
    if (seen.has(row.instanceId)) continue;
    rows.push(row);
    seen.add(row.instanceId);
  }
  return capStoredDeletionRecords(rows);
}

export function writeDeletionHistory(workspaceId: string, records: DeletionHistoryRecord[]): void {
  persistPointers(workspaceId, records);
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
  writeControlSnapshots(
    workspaceId,
    readControlSnapshots(workspaceId).filter((item) => item.instanceId !== instanceId),
  );
  persistPointers(
    workspaceId,
    readPersistedDeletionHistory(workspaceId).filter((item) => item.instanceId !== instanceId),
  );
  return readDeletionHistory(workspaceId);
}

export function forgetControlDeletionState(
  workspaceId: string,
  instanceId: string,
): DeletionHistoryRecord[] {
  writeControlSnapshots(
    workspaceId,
    readControlSnapshots(workspaceId).filter((item) => item.instanceId !== instanceId),
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
  const snapshots = readControlSnapshots(workspaceId).filter((item) => item.instanceId !== record.instanceId);
  if (record.state) snapshots.push(record);
  writeControlSnapshots(workspaceId, snapshots);
  const next = readPersistedDeletionHistory(workspaceId).filter((item) => item.instanceId !== record.instanceId);
  next.push(record);
  persistPointers(workspaceId, next);
  return readDeletionHistory(workspaceId);
}

export function resetDeletionHistoryStore(): void {
  submittingByWorkspace.clear();
  controlByWorkspace.clear();
}

function isDeletionHistoryRecord(value: unknown): value is DeletionHistoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as DeletionHistoryRecord;
  return (record.phase === "submitting" || record.phase === "tracking") &&
    typeof record.instanceId === "string" &&
    record.instanceId.length > 0;
}
