import { describe, expect, it } from "vitest";
import {
  MANAGED_DELETION_HISTORY_LIMIT,
  PREVIOUS_DELETIONS_HEADING,
  SUCCEEDED_DELETION_ON_SENTENCE,
  SUCCEEDED_DELETION_REQUEST_ACCEPTED_SENTENCE,
  SUCCEEDED_DELETION_SENTENCE,
  DELETING_THIS_ENGINE_HEADING,
  UNFINISHED_DELETE_STATE_CANCELLED,
  UNFINISHED_DELETE_STATE_DELETING,
  UNFINISHED_DELETE_STATE_NEEDS_ATTENTION,
  UNFINISHED_DELETE_STATE_UNAVAILABLE,
  capStoredDeletionRecords,
  deletionCompletedAt,
  deletionEngineDisplayName,
  deletionRecordClock,
  formatDeletionWhen,
  partitionDeletionRecords,
  succeededDeletionSentence,
  unfinishedDeleteStateLabel,
  type DeletionHistoryRecord,
} from "./managedEngineDeletionHistory";

const when = "2026-10-20T15:04:00.000Z";
const whenLabel = formatDeletionWhen(when);

function record(overrides: Partial<DeletionHistoryRecord> = {}): DeletionHistoryRecord {
  return {
    phase: "tracking",
    instanceId: "11111111-1111-4111-8111-111111111111",
    instanceName: "Prod",
    completedAt: when,
    state: "Succeeded",
    ...overrides,
  };
}

describe("deletion history copy", () => {
  it("pins the three signed succeeded sentences exactly", () => {
    expect(SUCCEEDED_DELETION_ON_SENTENCE).toBe("{name} deleted on {when}");
    expect(SUCCEEDED_DELETION_REQUEST_ACCEPTED_SENTENCE).toBe("{name} deleted. Request accepted {when}.");
    expect(SUCCEEDED_DELETION_SENTENCE).toBe("{name} deleted.");

    expect(succeededDeletionSentence("Prod", deletionRecordClock(record()))).toBe(
      `Prod deleted on ${whenLabel}`,
    );

    const acceptedOnly = record({ completedAt: null, acceptedAt: when });
    expect(succeededDeletionSentence("Prod", deletionRecordClock(acceptedOnly))).toBe(
      `Prod deleted. Request accepted ${whenLabel}.`,
    );

    const neither = record({ completedAt: null, acceptedAt: null, requestedAt: null });
    expect(succeededDeletionSentence("Prod", deletionRecordClock(neither))).toBe("Prod deleted.");
  });

  it("pins the signed clock labels", () => {
    expect(deletionRecordClock(record()).label).toBe(`Deleted on ${whenLabel}`);
    expect(deletionRecordClock(record({ completedAt: null, acceptedAt: when })).label)
      .toBe(`Request accepted ${whenLabel}`);
    expect(deletionRecordClock(record({ completedAt: null, acceptedAt: null, requestedAt: when })).label)
      .toBe(`Requested ${whenLabel}`);
    expect(deletionRecordClock(record({ completedAt: null, acceptedAt: null, requestedAt: null })).label)
      .toBe("Completion time unavailable");
    expect(deletionRecordClock(record({
      state: "Failed",
      completedAt: null,
      acceptedAt: null,
      requestedAt: null,
    })).label).toBe("Request time unavailable");
    expect(PREVIOUS_DELETIONS_HEADING).toBe("Previous deletions");
  });

  it("maps unfinished delete states onto signed labels", () => {
    expect(DELETING_THIS_ENGINE_HEADING).toBe("Deleting this engine");
    expect(UNFINISHED_DELETE_STATE_DELETING).toBe("Deleting");
    expect(UNFINISHED_DELETE_STATE_NEEDS_ATTENTION).toBe("Needs attention");
    expect(UNFINISHED_DELETE_STATE_CANCELLED).toBe("Deletion cancelled");
    expect(UNFINISHED_DELETE_STATE_UNAVAILABLE).toBe("Status unavailable");
    expect(unfinishedDeleteStateLabel("Pending")).toBe("Deleting");
    expect(unfinishedDeleteStateLabel("InProgress")).toBe("Deleting");
    expect(unfinishedDeleteStateLabel("Accepted")).toBe("Deleting");
    expect(unfinishedDeleteStateLabel("Running")).toBe("Deleting");
    expect(unfinishedDeleteStateLabel("Failed")).toBe("Needs attention");
    expect(unfinishedDeleteStateLabel("RecoveryRequired")).toBe("Needs attention");
    expect(unfinishedDeleteStateLabel("Cancelled")).toBe("Deletion cancelled");
    expect(unfinishedDeleteStateLabel("Canceled")).toBe("Deletion cancelled");
    expect(unfinishedDeleteStateLabel("Unknown")).toBe("Status unavailable");
    expect(unfinishedDeleteStateLabel("")).toBe("Status unavailable");
    expect(unfinishedDeleteStateLabel(null)).toBe("Status unavailable");
    expect(unfinishedDeleteStateLabel(undefined)).toBe("Status unavailable");
    expect(unfinishedDeleteStateLabel("Failed")).not.toBe("Failed");
    expect(unfinishedDeleteStateLabel("RecoveryRequired")).not.toBe("Failed");
  });

  it("uses a Succeeded Delete completedAt only, never Create or Restart", () => {
    const deleteCompleted = "2026-10-20T16:00:00.000Z";
    const createCompleted = "2026-10-01T00:00:00.000Z";
    expect(deletionCompletedAt(
      { action: "Delete", state: "Succeeded", completedAt: deleteCompleted },
      { action: "Create", state: "Succeeded", completedAt: createCompleted },
    )).toBe(deleteCompleted);
    expect(deletionCompletedAt(
      { action: "Delete", state: "Succeeded", completedAt: null },
      { action: "Delete", state: "Succeeded", completedAt: deleteCompleted },
    )).toBe(deleteCompleted);
    expect(deletionCompletedAt(null, { action: "Delete", state: "Succeeded", completedAt: deleteCompleted }))
      .toBe(deleteCompleted);
    expect(deletionCompletedAt(
      { action: "Create", state: "Succeeded", completedAt: createCompleted },
      { action: "Restart", state: "Succeeded", completedAt: createCompleted },
    )).toBeNull();
    expect(deletionCompletedAt(null, { action: "Create", completedAt: createCompleted })).toBeNull();
    expect(deletionCompletedAt(null, { action: "Restart", completedAt: createCompleted })).toBeNull();
    expect(deletionCompletedAt(null, null)).toBeNull();
  });

  it("falls back from deleted on {when} when a Succeeded row's last operation is not a Delete", () => {
    const createCompleted = "2026-10-01T00:00:00.000Z";
    const createWhen = formatDeletionWhen(createCompleted);
    const clock = deletionRecordClock(
      record({ completedAt: createCompleted, acceptedAt: null, requestedAt: null }),
      { action: "Create", state: "Succeeded", completedAt: createCompleted },
    );
    expect(clock.when).toBeNull();
    expect(clock.provenance).toBe("unavailable");
    expect(succeededDeletionSentence("Prod", clock)).toBe("Prod deleted.");
    expect(succeededDeletionSentence("Prod", clock)).not.toContain(createWhen);
    expect(clock.label).not.toMatch(/deleted on/i);
  });

  it("names unnamed rows Previous engine or Unnamed engine", () => {
    expect(deletionEngineDisplayName({
      instanceName: null,
      liveName: null,
      record: record(),
    })).toBe("Previous engine");
    expect(deletionEngineDisplayName({
      instanceName: null,
      liveName: null,
      record: record({ state: "Failed" }),
    })).toBe("Unnamed engine");
    expect(deletionEngineDisplayName({
      instanceName: "Managed engine",
      liveName: null,
      record: record(),
    })).toBe("Previous engine");
  });

  it("never emits Previous engine (deleted …)", () => {
    const sentence = succeededDeletionSentence("Previous engine", deletionRecordClock(record()));
    expect(sentence).toBe(`Previous engine deleted on ${whenLabel}`);
    expect(sentence).not.toMatch(/Previous engine \(deleted/);
  });

  it("caps stored history by dropping the oldest succeeded rows and keeping unfinished ones", () => {
    const succeeded = Array.from({ length: 25 }, (_, index) => record({
      instanceId: `${index.toString().padStart(8, "0")}-1111-4111-8111-111111111111`,
      completedAt: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));
    const inProgress = record({
      instanceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      completedAt: null,
      acceptedAt: when,
      state: "Accepted",
    });
    const failed = record({
      instanceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      completedAt: null,
      acceptedAt: when,
      state: "Failed",
    });
    const capped = capStoredDeletionRecords([...succeeded, inProgress, failed]);
    expect(capped).toHaveLength(MANAGED_DELETION_HISTORY_LIMIT);
    expect(MANAGED_DELETION_HISTORY_LIMIT).toBe(20);
    expect(capped).toContainEqual(inProgress);
    expect(capped).toContainEqual(failed);
    expect(capped).not.toContainEqual(succeeded[0]);
    expect(capped).not.toContainEqual(succeeded[1]);
    expect(capped).not.toContainEqual(succeeded[2]);
    expect(capped).not.toContainEqual(succeeded[3]);
    expect(capped).not.toContainEqual(succeeded[4]);
    expect(capped).not.toContainEqual(succeeded[5]);
    expect(capped).not.toContainEqual(succeeded[6]);
    expect(capped).toContainEqual(succeeded[7]);
    expect(capped).toContainEqual(succeeded[24]);
  });

  it("moves a succeeded delete into history when a later engine is live", () => {
    const deleted = record({ instanceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", completedAt: "2026-10-01T00:00:00.000Z" });
    const { livePanel, history } = partitionDeletionRecords([deleted], [
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", createdAt: "2026-10-10T00:00:00.000Z" },
    ]);
    expect(livePanel).toEqual([]);
    expect(history).toEqual([deleted]);
  });
});
