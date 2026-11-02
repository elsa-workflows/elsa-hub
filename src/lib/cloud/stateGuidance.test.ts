import { describe, expect, it } from "vitest";
import { provisioningStageLabels } from "./provisioningLabels";
import {
  STATE_GUIDANCE_CANCELLED,
  STATE_GUIDANCE_FAILED_BEFORE_READY,
  STATE_GUIDANCE_NEEDS_ATTENTION,
  STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE,
  stateGuidance,
} from "./stateGuidance";
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

const failedAtConfiguration =
  `Provisioning stopped at this step: ${provisioningStageLabels.configuration}. Email hello@valence.works with this engine's name and we'll help during business hours.`;
const pausedAtConfiguration =
  `Provisioning needs attention. Paused at this step: ${provisioningStageLabels.configuration}. Check again or email hello@valence.works if it remains here.`;

describe("stateGuidance", () => {
  it("matches the signed temporarily-unavailable, cancelled, failed and attention strings", () => {
    expect(STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE).toBe(
      "Detailed provisioning progress can't be loaded. Refresh this page to check again.",
    );
    expect(stateGuidance(base, true)).toBe(STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE);
    expect(STATE_GUIDANCE_CANCELLED).toBe(
      "Provisioning was cancelled before the engine was ready. Email hello@valence.works if you need help restarting.",
    );
    expect(stateGuidance({ ...base, diagnosticCode: "provisioning.cancelled" }, false)).toBe(
      STATE_GUIDANCE_CANCELLED,
    );
    expect(failedAtConfiguration).toBe(
      "Provisioning stopped at this step: Configuring registry, secrets, network, and database. Email hello@valence.works with this engine's name and we'll help during business hours.",
    );
    expect(stateGuidance({ ...base, state: "failed" }, false)).toBe(failedAtConfiguration);
    expect(pausedAtConfiguration).toBe(
      "Provisioning needs attention. Paused at this step: Configuring registry, secrets, network, and database. Check again or email hello@valence.works if it remains here.",
    );
    expect(stateGuidance({ ...base, state: "stale" }, false)).toBe(pausedAtConfiguration);
  });

  it("shows the Failed line only for a Failed Control state with a labelled currentStage", () => {
    expect(stateGuidance({ ...base, state: "Failed", currentStage: "hosting-foundation" }, false)).toBe(
      `Provisioning stopped at this step: ${provisioningStageLabels["hosting-foundation"]}. Email hello@valence.works with this engine's name and we'll help during business hours.`,
    );
  });

  it("uses the signed no-stage Failed line when Control sends no currentStage", () => {
    expect(STATE_GUIDANCE_FAILED_BEFORE_READY).toBe(
      "Provisioning stopped before the engine was ready. Email hello@valence.works with this engine's name and we'll help during business hours.",
    );
    expect(stateGuidance({ ...base, state: "failed", currentStage: null }, false)).toBe(
      STATE_GUIDANCE_FAILED_BEFORE_READY,
    );
  });

  it("never shows the Failed line for active, ready, stale, unavailable, or cancelled", () => {
    for (const state of ["active", "ready", "stale", "unavailable", "cancelled"] as const) {
      for (const diagnosticCode of [null, "provisioning.failed"] as const) {
        const copy = stateGuidance(
          {
            ...base,
            state,
            diagnosticCode: state === "cancelled" && diagnosticCode === null
              ? "provisioning.cancelled"
              : diagnosticCode,
          },
          false,
        );
        expect(copy).not.toBe(failedAtConfiguration);
        expect(copy).not.toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
        expect(copy ?? "").not.toMatch(/Provisioning stopped/);
      }
    }
  });

  it("uses the no-stage Failed line for an unknown or unlabelled currentStage, never the raw code", () => {
    const unknown = stateGuidance({ ...base, state: "failed", currentStage: "not-a-stage" }, false);
    expect(unknown).toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
    expect(unknown).not.toContain("not-a-stage");
    expect(stateGuidance({ ...base, state: "failed", currentStage: "the current stage" }, false))
      .toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
    expect(STATE_GUIDANCE_NEEDS_ATTENTION).toBe(
      "Provisioning needs attention. Check again or email hello@valence.works if it remains here.",
    );
    expect(stateGuidance({ ...base, state: "stale", currentStage: "not-a-stage" }, false)).toBe(
      STATE_GUIDANCE_NEEDS_ATTENTION,
    );
    expect(stateGuidance({ ...base, state: "stale", currentStage: "not-a-stage" }, false))
      .not.toContain("not-a-stage");
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
