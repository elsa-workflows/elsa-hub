import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { provisioningStageLabels } from "./provisioningLabels";
import {
  PROVISIONING_FAILURE_FALLBACK_LINE,
  PROVISIONING_NEXT_STEP_NEITHER,
} from "./provisioningFailureReason";
import {
  STATE_GUIDANCE_CANCELLED,
  STATE_GUIDANCE_FAILED_BEFORE_READY,
  STATE_GUIDANCE_NEEDS_ATTENTION,
  STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE,
  stateGuidance,
} from "./stateGuidance";
import type { ManagedProvisioningProgress } from "./provisioningProgress";

const here = dirname(fileURLToPath(import.meta.url));

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

const SIGNED_FAILED_GUIDANCE =
  "Setup stopped before your engine was ready. For help, email hello@valence.works.";
const SIGNED_NEITHER = "For help, email hello@valence.works.";

describe("stateGuidance", () => {
  it("uses only already-signed #1011 strings for failed and attention states", () => {
    expect(PROVISIONING_FAILURE_FALLBACK_LINE).toBe("Setup stopped before your engine was ready.");
    expect(PROVISIONING_NEXT_STEP_NEITHER).toBe(SIGNED_NEITHER);
    expect(STATE_GUIDANCE_FAILED_BEFORE_READY).toBe(SIGNED_FAILED_GUIDANCE);
    expect(STATE_GUIDANCE_FAILED_BEFORE_READY).toBe(
      `${PROVISIONING_FAILURE_FALLBACK_LINE} ${PROVISIONING_NEXT_STEP_NEITHER}`,
    );
    expect(STATE_GUIDANCE_NEEDS_ATTENTION).toBe(SIGNED_NEITHER);
    expect(STATE_GUIDANCE_NEEDS_ATTENTION).toBe(PROVISIONING_NEXT_STEP_NEITHER);
    // Straight apostrophes only (these two signed lines happen to have none).
    expect(STATE_GUIDANCE_FAILED_BEFORE_READY).not.toMatch(/[\u2018\u2019\u201C\u201D]/);
    expect(STATE_GUIDANCE_NEEDS_ATTENTION).not.toMatch(/[\u2018\u2019\u201C\u201D]/);
  });

  it("matches the temporarily-unavailable and cancelled strings", () => {
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
  });

  it("returns the signed fallback plus Neither line for every failed state, ignoring currentStage", () => {
    expect(stateGuidance({ ...base, state: "failed" }, false)).toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
    expect(stateGuidance({ ...base, state: "Failed", currentStage: "hosting-foundation" }, false)).toBe(
      STATE_GUIDANCE_FAILED_BEFORE_READY,
    );
    expect(stateGuidance({ ...base, state: "failed", currentStage: null }, false)).toBe(
      STATE_GUIDANCE_FAILED_BEFORE_READY,
    );
    const unknown = stateGuidance({ ...base, state: "failed", currentStage: "not-a-stage" }, false);
    expect(unknown).toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
    expect(unknown).not.toContain("not-a-stage");
    expect(stateGuidance({ ...base, state: "failed", currentStage: "the current stage" }, false))
      .toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
    expect(stateGuidance({ ...base, state: "failed" }, false)).not.toContain(
      provisioningStageLabels.configuration,
    );
  });

  it("returns only the signed Neither line for stale or requires-attention, ignoring currentStage", () => {
    expect(stateGuidance({ ...base, state: "stale" }, false)).toBe(STATE_GUIDANCE_NEEDS_ATTENTION);
    expect(stateGuidance({ ...base, state: "stale", currentStage: "configuration" }, false)).toBe(
      STATE_GUIDANCE_NEEDS_ATTENTION,
    );
    expect(stateGuidance({ ...base, state: "stale", currentStage: "not-a-stage" }, false)).toBe(
      STATE_GUIDANCE_NEEDS_ATTENTION,
    );
    expect(stateGuidance({ ...base, state: "stale", currentStage: "not-a-stage" }, false))
      .not.toContain("not-a-stage");
    expect(stateGuidance({ ...base, diagnosticCode: "provisioning.requires-attention" }, false)).toBe(
      STATE_GUIDANCE_NEEDS_ATTENTION,
    );
    expect(stateGuidance({ ...base, state: "stale" }, false)).not.toContain(
      provisioningStageLabels.configuration,
    );
  });

  it("never shows the failed guidance for active, ready, stale, unavailable, or cancelled", () => {
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
        expect(copy).not.toBe(STATE_GUIDANCE_FAILED_BEFORE_READY);
        expect(copy ?? "").not.toMatch(/Provisioning stopped/);
        expect(copy ?? "").not.toContain("Setup stopped before your engine was ready.");
      }
    }
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

  it("drops the legacy interpolated and duration-implying guidance from production source", () => {
    const source = readFileSync(join(here, "stateGuidance.ts"), "utf8");
    expect(source).not.toMatch(/we'll help during business hours/);
    expect(source).not.toMatch(/if it remains here/);
    expect(source).not.toMatch(/Provisioning stopped at this step/);
    expect(source).not.toMatch(/Paused at this step/);
    expect(source).not.toMatch(/Provisioning stopped before the engine was ready/);
    expect(source).not.toMatch(/Provisioning needs attention\. Check again/);
  });
});
