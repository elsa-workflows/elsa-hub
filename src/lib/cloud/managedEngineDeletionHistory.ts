export type DeletionHistoryInstance = {
  id: string;
  name?: string | null;
  slug?: string | null;
  createdAt?: string | null;
};

export const MANAGED_DELETION_HISTORY_LIMIT = 20;

export type DeletionHistoryRecord = {
  phase: "submitting" | "tracking";
  instanceId: string;
  instanceName?: string | null;
  acceptedAt?: string;
  completedAt?: string | null;
  requestedAt?: string | null;
  state?: string;
};

export type DeletionDateProvenance = "completed" | "accepted" | "requested" | "unavailable";

export type DeletionRecordClock = {
  when: string | null;
  dateTime: string | null;
  provenance: DeletionDateProvenance;
  label: string;
  claimsDeleted: boolean;
};

export function snapshotManagedEngineName(instance?: DeletionHistoryInstance | null): string | null {
  const name = instance?.name?.trim() || instance?.slug?.trim() || "";
  return name.length > 0 ? name : null;
}

export function formatDeletionWhen(value?: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function isSucceededDeletion(record: Pick<DeletionHistoryRecord, "phase" | "state">): boolean {
  return record.phase === "tracking" && record.state === "Succeeded";
}

export function deletionRecordClock(record: DeletionHistoryRecord): DeletionRecordClock {
  const completedWhen = formatDeletionWhen(record.completedAt);
  const acceptedWhen = formatDeletionWhen(record.acceptedAt);
  const requestedWhen = formatDeletionWhen(record.requestedAt);
  const claimsDeleted = isSucceededDeletion(record);

  if (claimsDeleted && completedWhen) {
    return {
      when: completedWhen,
      dateTime: record.completedAt ?? null,
      provenance: "completed",
      label: `Deleted on ${completedWhen}`,
      claimsDeleted,
    };
  }
  if (acceptedWhen) {
    return {
      when: acceptedWhen,
      dateTime: record.acceptedAt ?? null,
      provenance: "accepted",
      label: `Request accepted ${acceptedWhen}`,
      claimsDeleted,
    };
  }
  if (requestedWhen) {
    return {
      when: null,
      dateTime: null,
      provenance: "unavailable",
      label: "Request time unavailable",
      claimsDeleted,
    };
  }
  return {
    when: null,
    dateTime: null,
    provenance: "unavailable",
    label: claimsDeleted
      ? "Completion time unavailable"
      : "Request time unavailable",
    claimsDeleted,
  };
}

export function deletionEngineDisplayName(input: {
  instanceName?: string | null;
  liveName?: string | null;
  record: Pick<DeletionHistoryRecord, "phase" | "state" | "acceptedAt" | "completedAt" | "requestedAt">;
}): string {
  const named = input.instanceName?.trim() || input.liveName?.trim() || "";
  if (named.length > 0 && named !== "Managed engine") return named;

  return isSucceededDeletion(input.record) ? "Previous engine" : "Unnamed engine";
}

export const SUCCEEDED_DELETION_SENTENCE = "{name} deleted.";
export const SUCCEEDED_DELETION_REQUEST_ACCEPTED_SENTENCE = "{name} deleted. Request accepted {when}.";

export function succeededDeletionSentence(
  name: string,
  clock: DeletionRecordClock,
  record?: Pick<DeletionHistoryRecord, "completedAt" | "acceptedAt">,
): string {
  const completedAt = record?.completedAt;
  if (!completedAt) return name;
  const acceptedWhen = formatDeletionWhen(record?.acceptedAt);
  if (acceptedWhen) return `${name} deleted. Request accepted ${acceptedWhen}.`;
  return `${name} deleted.`;
}

export function unfinishedDeleteStateLabel(state?: string | null): string | null {
  if (!state) return null;
  if (state === "RecoveryRequired") return "Needs attention";
  return state;
}

export function deletionRowText(name: string, record: DeletionHistoryRecord): string {
  const clock = deletionRecordClock(record);
  if (isSucceededDeletion(record) && record.completedAt) {
    return succeededDeletionSentence(name, clock, record);
  }
  const state = unfinishedDeleteStateLabel(record.state);
  const time = clock.provenance === "accepted" && clock.when
    ? `Request accepted ${clock.when}.`
    : `${clock.label}.`;
  return state ? `${name}. ${state}. ${time}` : `${name}. ${time}`;
}

function timestampMillis(value?: string | null) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

function deletionOccurredAt(record: DeletionHistoryRecord) {
  const completed = timestampMillis(record.completedAt);
  if (Number.isFinite(completed)) return completed;
  return timestampMillis(record.acceptedAt);
}

export function isSucceededPriorDeletion(
  record: DeletionHistoryRecord,
  liveInstances: ReadonlyArray<Pick<DeletionHistoryInstance, "id" | "createdAt">>,
): boolean {
  if (!isSucceededDeletion(record)) return false;
  const deletedAt = deletionOccurredAt(record);
  return liveInstances.some((instance) => {
    if (instance.id === record.instanceId) return false;
    const createdAt = timestampMillis(instance.createdAt);
    if (Number.isFinite(createdAt) && Number.isFinite(deletedAt)) return createdAt > deletedAt;
    return true;
  });
}

/** Drops oldest succeeded rows so browser-only history stays near the cap. In-progress and failed rows are kept. */
export function capStoredDeletionRecords<T extends DeletionHistoryRecord>(
  records: readonly T[],
  limit = MANAGED_DELETION_HISTORY_LIMIT,
): T[] {
  if (records.length <= limit) return [...records];
  const succeeded = records.filter(isSucceededDeletion);
  const overflow = records.length - limit;
  if (overflow <= 0 || succeeded.length === 0) return [...records];
  const dropCount = Math.min(overflow, succeeded.length);
  const drop = new Set(
    [...succeeded]
      .sort((left, right) => {
        const leftTime = deletionOccurredAt(left);
        const rightTime = deletionOccurredAt(right);
        const leftSort = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
        const rightSort = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;
        return leftSort - rightSort;
      })
      .slice(0, dropCount),
  );
  return records.filter((record) => !drop.has(record));
}

export function partitionDeletionRecords<T extends DeletionHistoryRecord>(
  records: readonly T[],
  liveInstances: ReadonlyArray<Pick<DeletionHistoryInstance, "id" | "createdAt">>,
): { livePanel: T[]; history: T[] } {
  const livePanel: T[] = [];
  const history: T[] = [];
  for (const record of records) {
    if (isSucceededPriorDeletion(record, liveInstances)) history.push(record);
    else livePanel.push(record);
  }
  return { livePanel, history };
}
