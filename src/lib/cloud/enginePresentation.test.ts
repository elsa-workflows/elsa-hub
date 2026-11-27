import { describe, expect, it } from "vitest";
import {
  cloudHealthLabel,
  isSetupFailure,
  partitionCloudEngines,
  shouldHideHealth,
  usableOperationId,
} from "./enginePresentation";
import { mergeControlDeletedEngines } from "./managedEngineDeletionHistory";
import {
  controlDeletedOverview,
  controlFailedAfterReadyOverview,
  controlFailedSetupOverview,
  controlFailedWithoutOperationOverview,
} from "./controlOverview.fixtures";

describe("isSetupFailure", () => {
  it("is true only for Failed with lastOperation Create or Retry", () => {
    expect(isSetupFailure("Failed", { action: "Create" })).toBe(true);
    expect(isSetupFailure("Failed", { action: "Retry" })).toBe(true);
    expect(isSetupFailure("Failed", { action: "Restart" })).toBe(false);
    expect(isSetupFailure("Failed", null)).toBe(false);
    expect(isSetupFailure("Ready", { action: "Create" })).toBe(false);
  });
});

describe("health visibility", () => {
  it("hides Health on Failed because Control forces Unreachable", () => {
    expect(shouldHideHealth(controlFailedSetupOverview().status, controlFailedSetupOverview().health)).toBe(true);
    expect(shouldHideHealth(controlFailedAfterReadyOverview().status, "Unreachable")).toBe(true);
    expect(shouldHideHealth(controlFailedWithoutOperationOverview().status, "Unreachable")).toBe(true);
  });

  it("hides Health when it is Unknown, and shows signed labels otherwise", () => {
    expect(shouldHideHealth("Ready", "Unknown")).toBe(true);
    expect(shouldHideHealth("Ready", "Healthy")).toBe(false);
    expect(cloudHealthLabel("Degraded")).toBe("Not fully healthy");
    expect(cloudHealthLabel("Unreachable")).toBe("Not responding");
    expect(cloudHealthLabel("Unknown")).toBeNull();
  });
});

describe("usableOperationId", () => {
  it("rejects empty and Guid.Empty", () => {
    expect(usableOperationId(null)).toBeNull();
    expect(usableOperationId("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(usableOperationId("22222222-2222-4222-8222-222222222222")).toBe(
      "22222222-2222-4222-8222-222222222222",
    );
  });
});

describe("mergeControlDeletedEngines", () => {
  it("merges Control Deleted engines with local records and dedupes by id, preferring a completion date", () => {
    const deleted = controlDeletedOverview();
    const merged = mergeControlDeletedEngines(
      [{
        phase: "tracking",
        instanceId: deleted.id,
        instanceName: "Local name",
        operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        state: "Succeeded",
      }],
      [deleted],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].completedAt).toBe("2026-11-27T14:05:00.000Z");
    expect(merged[0].operationId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("leaves Deleting engines out of the Deleted partition", () => {
    const { live, deleted } = partitionCloudEngines([
      { status: "Ready", id: "1" },
      { status: "Deleting", id: "2" },
      { status: "Deleted", id: "3" },
    ]);
    expect(live.map((engine) => engine.id)).toEqual(["1", "2"]);
    expect(deleted.map((engine) => engine.id)).toEqual(["3"]);
  });
});
