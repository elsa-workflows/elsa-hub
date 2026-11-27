import { afterEach, describe, expect, it } from "vitest";
import {
  NEEDS_ATTENTION_LABEL,
  cloudEngineStatusLabel,
  cloudEngineStatusVariant,
  shouldPollCloudEngine,
} from "./engineStatus";
import { setCloudSignedCopyEnabledForTests } from "@/lib/cloudClient/signedCopyFlag";
import { CLOUD_STATUS_NOT_FULLY_HEALTHY, CLOUD_STATUS_SETTING_UP, CLOUD_STATUS_SETUP_STOPPED, CLOUD_STATUS_UNAVAILABLE } from "@/lib/cloudClient/signedCopy";

afterEach(() => setCloudSignedCopyEnabledForTests(undefined));

describe("engineStatus", () => {
  it("labels RecoveryRequired as Needs attention on every path", () => {
    expect(cloudEngineStatusLabel("RecoveryRequired")).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusLabel("Provisioning", "RecoveryRequired")).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusLabel("Failed", "RecoveryRequired")).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusVariant("RecoveryRequired")).toBe("warning");
    expect(cloudEngineStatusLabel("Provisioning")).toBe(CLOUD_STATUS_SETTING_UP);
  });

  it("keeps polling while RecoveryRequired", () => {
    expect(shouldPollCloudEngine("RecoveryRequired")).toBe(true);
    expect(shouldPollCloudEngine("Ready", "RecoveryRequired")).toBe(true);
    expect(shouldPollCloudEngine("Ready")).toBe(false);
  });

  it("labels a Failed setup as Setup stopped, and any other Failed as Needs attention", () => {
    expect(cloudEngineStatusLabel("Failed", null, { action: "Create" })).toBe(CLOUD_STATUS_SETUP_STOPPED);
    expect(cloudEngineStatusLabel("Failed", null, { action: "Retry" })).toBe(CLOUD_STATUS_SETUP_STOPPED);
    expect(cloudEngineStatusLabel("Failed", null, { action: "Restart" })).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusLabel("Failed", null, null)).toBe(NEEDS_ATTENTION_LABEL);
    expect(cloudEngineStatusLabel("Failed")).toBe(NEEDS_ATTENTION_LABEL);
  });

  it("uses signed labels for Degraded and Unknown, and never returns Not running", () => {
    expect(cloudEngineStatusLabel("Degraded")).toBe(CLOUD_STATUS_NOT_FULLY_HEALTHY);
    expect(cloudEngineStatusLabel("Unknown")).toBe(CLOUD_STATUS_UNAVAILABLE);
    expect(cloudEngineStatusLabel("Failed", null, { action: "Restart" })).not.toBe("Not running");
    expect(cloudEngineStatusLabel("Failed", null, { action: "Restart" })).not.toBe("Failed");
  });

  it("falls back to the raw status when the signed-copy setting is off", () => {
    setCloudSignedCopyEnabledForTests(false);
    expect(cloudEngineStatusLabel("Provisioning")).toBe("Provisioning");
    expect(cloudEngineStatusLabel("Failed")).toBe("Failed");
  });
});
