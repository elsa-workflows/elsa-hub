import { afterEach, describe, expect, it } from "vitest";
import {
  deletionHistoryStorageKey,
  forgetControlDeletionState,
  isControlAcceptedDeletionRecord,
  readDeletionHistory,
  readPersistedDeletionHistory,
  removeDeletionHistoryRecord,
  resetDeletionHistoryStore,
  retainKnownDeletionRecords,
  upsertDeletionHistoryRecord,
  upsertSubmittingDeletionRecord,
} from "./deletionHistoryStore";
import {
  MANAGED_DELETION_HISTORY_LIMIT,
  UNFINISHED_DELETE_STATE_DELETING,
  UNFINISHED_DELETE_STATE_UNAVAILABLE,
  unfinishedDeleteStateLabel,
  type DeletionHistoryRecord,
} from "./managedEngineDeletionHistory";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const when = "2026-10-20T15:04:00.000Z";
const operationId = "55555555-5555-5555-5555-555555555555";

function accepted(overrides: Partial<DeletionHistoryRecord> = {}): DeletionHistoryRecord {
  return {
    phase: "tracking",
    instanceId: "11111111-1111-4111-8111-111111111111",
    instanceName: "Prod",
    operationId,
    acceptedAt: when,
    state: "Succeeded",
    completedAt: when,
    ...overrides,
  };
}

afterEach(() => {
  resetDeletionHistoryStore();
  localStorage.clear();
});

describe("deletionHistoryStore", () => {
  it("keeps a submitting row in the browser only until Control accepts it", () => {
    upsertSubmittingDeletionRecord(workspaceId, {
      instanceId: "11111111-1111-4111-8111-111111111111",
      instanceName: "Prod",
    });
    expect(readDeletionHistory(workspaceId)).toEqual([
      expect.objectContaining({
        phase: "submitting",
        instanceId: "11111111-1111-4111-8111-111111111111",
      }),
    ]);
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([]);
    expect(localStorage.getItem(deletionHistoryStorageKey(workspaceId))).toBeNull();

    upsertDeletionHistoryRecord(workspaceId, accepted());
    expect(readDeletionHistory(workspaceId)).toEqual([accepted()]);
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([
      {
        phase: "tracking",
        instanceId: accepted().instanceId,
        instanceName: "Prod",
        operationId,
        acceptedAt: when,
      },
    ]);
  });

  it("removes the submitting row when the start request fails", () => {
    upsertSubmittingDeletionRecord(workspaceId, {
      instanceId: "11111111-1111-4111-8111-111111111111",
      instanceName: "Prod",
    });
    expect(removeDeletionHistoryRecord(workspaceId, "11111111-1111-4111-8111-111111111111")).toEqual([]);
    expect(readDeletionHistory(workspaceId)).toEqual([]);
  });

  it("after a reload, takes Control-accepted pointers only and never shows a local unaccepted row", () => {
    const localSubmitting: DeletionHistoryRecord = {
      phase: "submitting",
      instanceId: "22222222-2222-4222-8222-222222222222",
      instanceName: "Local",
    };
    const unacceptedTracking: DeletionHistoryRecord = {
      phase: "tracking",
      instanceId: "33333333-3333-4333-8333-333333333333",
      instanceName: "Unaccepted",
    };
    localStorage.setItem(
      deletionHistoryStorageKey(workspaceId),
      JSON.stringify([localSubmitting, unacceptedTracking, accepted()]),
    );
    upsertSubmittingDeletionRecord(workspaceId, {
      instanceId: "44444444-4444-4444-8444-444444444444",
      instanceName: "Session",
    });

    resetDeletionHistoryStore();

    expect(isControlAcceptedDeletionRecord(localSubmitting)).toBe(false);
    expect(isControlAcceptedDeletionRecord(unacceptedTracking)).toBe(false);
    expect(isControlAcceptedDeletionRecord(accepted())).toBe(true);
    expect(readDeletionHistory(workspaceId)).toEqual([
      {
        phase: "tracking",
        instanceId: accepted().instanceId,
        instanceName: "Prod",
        operationId,
        acceptedAt: when,
      },
    ]);
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([
      {
        phase: "tracking",
        instanceId: accepted().instanceId,
        instanceName: "Prod",
        operationId,
        acceptedAt: when,
      },
    ]);
    expect(unfinishedDeleteStateLabel(
      readDeletionHistory(workspaceId)[0]?.state,
      readDeletionHistory(workspaceId)[0]?.phase,
    )).toBe(UNFINISHED_DELETE_STATE_UNAVAILABLE);
    expect(unfinishedDeleteStateLabel(
      readDeletionHistory(workspaceId)[0]?.state,
      readDeletionHistory(workspaceId)[0]?.phase,
    )).not.toBe(UNFINISHED_DELETE_STATE_DELETING);
  });

  it("does not persist Deleting after a closed tab reloads a stored Accepted row", () => {
    localStorage.setItem(
      deletionHistoryStorageKey(workspaceId),
      JSON.stringify([accepted({ state: "Accepted", completedAt: null })]),
    );
    resetDeletionHistoryStore();

    const [row] = readDeletionHistory(workspaceId);
    expect(row?.state).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(deletionHistoryStorageKey(workspaceId)) ?? "[]")[0].state)
      .toBeUndefined();
    expect(unfinishedDeleteStateLabel(row?.state, row?.phase)).toBe(UNFINISHED_DELETE_STATE_UNAVAILABLE);
    expect(unfinishedDeleteStateLabel(row?.state, row?.phase)).not.toBe(UNFINISHED_DELETE_STATE_DELETING);
  });

  it("shows Status unavailable, never Deleting, when the poll ends without Control state", () => {
    upsertDeletionHistoryRecord(workspaceId, accepted({ state: "Accepted", completedAt: null }));
    expect(unfinishedDeleteStateLabel(
      readDeletionHistory(workspaceId)[0]?.state,
      readDeletionHistory(workspaceId)[0]?.phase,
    )).toBe(UNFINISHED_DELETE_STATE_DELETING);

    forgetControlDeletionState(workspaceId, accepted().instanceId);

    const [row] = readDeletionHistory(workspaceId);
    expect(row?.state).toBeUndefined();
    expect(unfinishedDeleteStateLabel(row?.state, row?.phase)).toBe(UNFINISHED_DELETE_STATE_UNAVAILABLE);
    expect(unfinishedDeleteStateLabel(row?.state, row?.phase)).not.toBe(UNFINISHED_DELETE_STATE_DELETING);
  });

  it("trims stored pointers to 20 and drops rows Control does not know", () => {
    for (let index = 0; index < 21; index += 1) {
      upsertDeletionHistoryRecord(workspaceId, accepted({
        instanceId: `${index.toString().padStart(8, "0")}-1111-4111-8111-111111111111`,
        operationId: `${index.toString().padStart(8, "0")}-5555-4555-8555-555555555555`,
        acceptedAt: `2026-10-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        state: "Accepted",
        completedAt: null,
      }));
    }

    expect(readPersistedDeletionHistory(workspaceId)).toHaveLength(MANAGED_DELETION_HISTORY_LIMIT);
    expect(readPersistedDeletionHistory(workspaceId).map((row) => row.instanceId)).not.toContain(
      "00000000-1111-4111-8111-111111111111",
    );

    retainKnownDeletionRecords(workspaceId, new Set([
      "00000020-1111-4111-8111-111111111111",
    ]));
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([
      expect.objectContaining({ instanceId: "00000020-1111-4111-8111-111111111111" }),
    ]);
    expect(readDeletionHistory(workspaceId)).toEqual([
      expect.objectContaining({ instanceId: "00000020-1111-4111-8111-111111111111" }),
    ]);
  });
});
