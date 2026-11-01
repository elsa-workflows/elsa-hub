import { describe, expect, it } from "vitest";
import {
  CONTROL_PHASE_TO_STAGE,
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
});
