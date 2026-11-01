import { describe, expect, it } from "vitest";
import {
  MANAGED_DELETION_HISTORY_LIMIT,
  capStoredDeletionRecords,
  deletionEngineDisplayName,
  deletionRecordClock,
  partitionDeletionRecords,
  deletionRowText,
  succeededDeletionSentence,
  type DeletionHistoryRecord,
} from "./managedEngineDeletionHistory";

const when = "2026-10-20T15:04:00.000Z";

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
  it("uses the signed succeeded sentences", () => {
    const completed = deletionRecordClock(record());
    expect(succeededDeletionSentence("Prod", completed, record())).toBe("Prod deleted.");

    const withAccepted = record({ acceptedAt: when });
    expect(succeededDeletionSentence("Prod", deletionRecordClock(withAccepted), withAccepted))
      .toMatch(/^Prod deleted\. Request accepted /);

    const unknown = record({ completedAt: null, acceptedAt: null, requestedAt: null });
    expect(succeededDeletionSentence("Prod", deletionRecordClock(unknown), unknown)).toBe("Prod");
    expect(succeededDeletionSentence("Prod", deletionRecordClock(unknown), unknown)).not.toMatch(/deleted/);
  });

  it("omits the word deleted when Control sent no completedAt", () => {
    const unfinished = record({ completedAt: null, acceptedAt: when, state: "Failed" });
    const text = deletionRowText("Prod", unfinished);
    expect(text).not.toMatch(/deleted/i);
    expect(text).toMatch(/Failed/);
    expect(text).toMatch(/Request accepted /);
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
    const clock = deletionRecordClock(record());
    const sentence = succeededDeletionSentence("Previous engine", clock);
    expect(sentence).not.toMatch(/Previous engine \(deleted/);
  });

  it("caps stored history at 20 by dropping the oldest succeeded rows", () => {
    const records = Array.from({ length: 25 }, (_, index) => record({
      instanceId: `${index.toString().padStart(8, "0")}-1111-4111-8111-111111111111`,
      completedAt: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));
    const capped = capStoredDeletionRecords(records);
    expect(capped).toHaveLength(MANAGED_DELETION_HISTORY_LIMIT);
    expect(MANAGED_DELETION_HISTORY_LIMIT).toBe(20);
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
