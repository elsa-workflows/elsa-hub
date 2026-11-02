import { afterEach, describe, expect, it } from "vitest";
import { refreshDeletionHistoryFromControl } from "./deletionHistoryRefresh";
import {
  deletionHistoryStorageKey,
  readDeletionHistory,
  readPersistedDeletionHistory,
  resetDeletionHistoryStore,
  upsertDeletionHistoryRecord,
} from "./deletionHistoryStore";
import {
  UNFINISHED_DELETE_STATE_DELETING,
  UNFINISHED_DELETE_STATE_UNAVAILABLE,
  unfinishedDeleteStateLabel,
} from "./managedEngineDeletionHistory";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const instanceId = "11111111-1111-4111-8111-111111111111";
const operationId = "55555555-5555-5555-5555-555555555555";
const when = "2026-10-20T15:04:00.000Z";

afterEach(() => {
  resetDeletionHistoryStore();
  localStorage.clear();
});

describe("refreshDeletionHistoryFromControl", () => {
  it("replaces a stored Accepted row with Control's current state after reload", async () => {
    localStorage.setItem(
      deletionHistoryStorageKey(workspaceId),
      JSON.stringify([{
        phase: "tracking",
        instanceId,
        instanceName: "Prod",
        operationId,
        acceptedAt: when,
        state: "Accepted",
      }]),
    );
    resetDeletionHistoryStore();

    const rows = await refreshDeletionHistoryFromControl(workspaceId, async () => ({
      ok: true,
      state: "ready",
      workspaceId,
      engineId: instanceId,
      operation: {
        id: operationId,
        action: "Delete",
        state: "Failed",
        acceptedAt: when,
        completedAt: when,
      },
    }));

    expect(rows).toEqual([
      expect.objectContaining({ instanceId, state: "Failed" }),
    ]);
    expect(unfinishedDeleteStateLabel(rows[0]?.state, rows[0]?.phase)).not.toBe(
      UNFINISHED_DELETE_STATE_DELETING,
    );
    expect(readPersistedDeletionHistory(workspaceId)[0]?.state).toBeUndefined();
  });

  it("shows Status unavailable when Control status cannot be fetched", async () => {
    upsertDeletionHistoryRecord(workspaceId, {
      phase: "tracking",
      instanceId,
      instanceName: "Prod",
      operationId,
      acceptedAt: when,
      state: "Running",
    });

    const rows = await refreshDeletionHistoryFromControl(workspaceId, async () => ({
      ok: false,
      code: "invalid_request",
      error: "Delete did not reach a terminal state.",
    }));

    expect(rows).toEqual([
      expect.objectContaining({ instanceId, operationId, acceptedAt: when }),
    ]);
    expect(rows[0]?.state).toBeUndefined();
    expect(unfinishedDeleteStateLabel(rows[0]?.state, rows[0]?.phase)).toBe(
      UNFINISHED_DELETE_STATE_UNAVAILABLE,
    );
    expect(unfinishedDeleteStateLabel(rows[0]?.state, rows[0]?.phase)).not.toBe(
      UNFINISHED_DELETE_STATE_DELETING,
    );
  });

  it("drops a row Control does not know", async () => {
    upsertDeletionHistoryRecord(workspaceId, {
      phase: "tracking",
      instanceId,
      instanceName: "Prod",
      operationId,
      acceptedAt: when,
      state: "Accepted",
    });

    const rows = await refreshDeletionHistoryFromControl(workspaceId, async () => ({
      ok: false,
      code: "not_found",
      error: "This operation is not available.",
    }));

    expect(rows).toEqual([]);
    expect(readDeletionHistory(workspaceId)).toEqual([]);
    expect(readPersistedDeletionHistory(workspaceId)).toEqual([]);
  });
});
