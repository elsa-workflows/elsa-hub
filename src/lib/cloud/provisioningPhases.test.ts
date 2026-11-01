import { describe, expect, it } from "vitest";
import {
  CONTROL_PHASE_TO_STAGE,
  STAGE_STATUS_COMPLETE,
  STAGE_STATUS_IN_PROGRESS,
  STAGE_STATUS_NEEDS_ATTENTION,
  STAGE_STATUS_UP_NEXT,
  STATUS_UNAVAILABLE_LABEL,
  mapControlPhaseToStage,
  stageStatusLabel,
} from "./provisioningPhases";

describe("mapControlPhaseToStage", () => {
  it.each(Object.entries(CONTROL_PHASE_TO_STAGE))("maps %s to %s", (phase, stage) => {
    expect(mapControlPhaseToStage(phase, null)).toBe(stage);
  });

  it("highlights the workload step for FoundationReady plus Workload", () => {
    expect(mapControlPhaseToStage("FoundationReady", "Workload")).toBe("runtime-deployment");
  });

  it("returns null for an unknown or missing phase", () => {
    expect(mapControlPhaseToStage("NotAPhase", "AlsoUnknown")).toBeNull();
    expect(mapControlPhaseToStage(null, null)).toBeNull();
    expect(stageStatusLabel("unknown")).toBe(STATUS_UNAVAILABLE_LABEL);
    expect(STATUS_UNAVAILABLE_LABEL).toBe("status unavailable");
  });

  it("maps Control stage statuses onto the signed labels", () => {
    expect(STAGE_STATUS_COMPLETE).toBe("complete");
    expect(STAGE_STATUS_IN_PROGRESS).toBe("in progress");
    expect(STAGE_STATUS_NEEDS_ATTENTION).toBe("needs attention");
    expect(STAGE_STATUS_UP_NEXT).toBe("up next");
    expect(stageStatusLabel("completed")).toBe(STAGE_STATUS_COMPLETE);
    expect(stageStatusLabel("Completed")).toBe(STAGE_STATUS_COMPLETE);
    expect(stageStatusLabel("current")).toBe(STAGE_STATUS_IN_PROGRESS);
    expect(stageStatusLabel("blocked")).toBe(STAGE_STATUS_NEEDS_ATTENTION);
    expect(stageStatusLabel("pending")).toBe(STAGE_STATUS_UP_NEXT);
    expect(stageStatusLabel("unknown")).toBe(STATUS_UNAVAILABLE_LABEL);
    expect(stageStatusLabel("Queued")).toBe(STATUS_UNAVAILABLE_LABEL);
    expect(stageStatusLabel(undefined)).toBe(STATUS_UNAVAILABLE_LABEL);
  });
});
