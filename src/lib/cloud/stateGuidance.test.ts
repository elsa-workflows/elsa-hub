import { describe, expect, it } from "vitest";
import { provisioningStageLabels } from "./provisioningLabels";
import { stateGuidance } from "./stateGuidance";
import type { ManagedProvisioningProgress } from "./provisioningProgress";

const base: ManagedProvisioningProgress = {
  state: "active",
  currentStage: "configuration",
  startedAt: null,
  lastUpdatedAt: null,
  completedAt: null,
  diagnosticCode: null,
  stages: [],
  activity: [],
};

describe("stateGuidance", () => {
  it("matches the signed temporarily-unavailable, cancelled, failed and attention strings", () => {
    expect(stateGuidance(base, true)).toBe(
      "Detailed provisioning progress is temporarily unavailable. The engine status above remains current.",
    );
    expect(stateGuidance({ ...base, diagnosticCode: "provisioning.cancelled" }, false)).toBe(
      "Provisioning was cancelled before the engine was ready. Email hello@valence.works if you need help restarting.",
    );
    expect(stateGuidance({ ...base, state: "failed" }, false)).toBe(
      `Provisioning failed at ${provisioningStageLabels.configuration}. Review the safe guidance below or email hello@valence.works.`,
    );
    expect(stateGuidance({ ...base, state: "stale" }, false)).toBe(
      `Provisioning needs attention: paused at ${provisioningStageLabels.configuration}. Check again or email hello@valence.works if it remains here.`,
    );
  });

  it("contains no Control, contact support, alerted or monitoring wording", () => {
    const copy = [
      stateGuidance(base, true),
      stateGuidance({ ...base, diagnosticCode: "provisioning.cancelled" }, false),
      stateGuidance({ ...base, state: "failed" }, false),
      stateGuidance({ ...base, state: "stale" }, false),
    ].join("\n");
    expect(copy).not.toMatch(/Control/);
    expect(copy).not.toMatch(/contact support/i);
    expect(copy).not.toMatch(/alerted/i);
    expect(copy).not.toMatch(/monitoring|uptime/i);
  });
});
