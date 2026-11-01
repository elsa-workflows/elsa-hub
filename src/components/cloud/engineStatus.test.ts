import { describe, expect, it } from "vitest";
import {
  NEEDS_ATTENTION_LABEL,
  cloudEngineStatusLabel,
  cloudEngineStatusVariant,
  shouldPollCloudEngine,
} from "./engineStatus";

describe("engineStatus", () => {
  it("labels RecoveryRequired as Needs attention on every path", () => {
    expect(cloudEngineStatusLabel("RecoveryRequired")).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusLabel("Provisioning", "RecoveryRequired")).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusLabel("Failed", "RecoveryRequired")).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusVariant("RecoveryRequired")).toBe("warning");
    expect(cloudEngineStatusLabel("Provisioning")).toBe("Provisioning");
  });

  it("keeps polling while RecoveryRequired", () => {
    expect(shouldPollCloudEngine("RecoveryRequired")).toBe(true);
    expect(shouldPollCloudEngine("Ready", "RecoveryRequired")).toBe(true);
    expect(shouldPollCloudEngine("Ready")).toBe(false);
  });
});
