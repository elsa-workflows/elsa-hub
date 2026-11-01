import { afterEach, describe, expect, it } from "vitest";
import {
  deletionHistoryStorageKey,
  isControlAcceptedDeletionRecord,
  readDeletionHistory,
  readPersistedDeletionHistory,
  removeDeletionHistoryRecord,
  resetDeletionHistoryStore,
  upsertDeletionHistoryRecord,
  upsertSubmittingDeletionRecord,
} from "./deletionHistoryStore";
import type { DeletionHistoryRecord } from "./managedEngineDeletionHistory";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const when = "2026-10-20T15:04:00.000Z";

function accepted(overrides: Partial<DeletionHistoryRecord> = {}): DeletionHistoryRecord {
  return {
    phase: "tracking",
    instanceId: "11111111-1111-4111-8111-111111111111",
    instanceName: "Prod",
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
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([accepted()]);
  });

  it("removes the submitting row when the start request fails", () => {
    upsertSubmittingDeletionRecord(workspaceId, {
      instanceId: "11111111-1111-4111-8111-111111111111",
      instanceName: "Prod",
    });
    expect(removeDeletionHistoryRecord(workspaceId, "11111111-1111-4111-8111-111111111111")).toEqual([]);
    expect(readDeletionHistory(workspaceId)).toEqual([]);
  });

  it("after a reload, takes Control-accepted rows only and never shows a local unaccepted row", () => {
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
    expect(readDeletionHistory(workspaceId)).toEqual([accepted()]);
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([accepted()]);
  });
});
