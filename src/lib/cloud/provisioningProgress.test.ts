import { describe, expect, it } from "vitest";
import {
  UNKNOWN_ATTEMPT_CLOCK_LABEL,
  isUnmappedProvisioningSnapshot,
  presentProvisioningAttemptClock,
  shouldAdoptManagedProvisioningProgress,
  type ManagedProvisioningProgress,
} from "./provisioningProgress";

const STAGE_CODES = [
  "request-accepted",
  "hosting-foundation",
  "configuration",
  "runtime-deployment",
  "health-verification",
  "traffic-routing",
  "ready",
] as const;

function progress(overrides: Partial<ManagedProvisioningProgress> = {}): ManagedProvisioningProgress {
  return {
    state: "active",
    currentStage: "runtime-deployment",
    startedAt: "2026-10-27T00:00:00.000Z",
    lastUpdatedAt: "2026-10-27T01:00:00.000Z",
    completedAt: null,
    diagnosticCode: null,
    attemptNumber: 1,
    attemptStartedAt: "2026-10-27T00:00:00.000Z",
    stages: STAGE_CODES.map((code) => ({ code, status: "pending" })),
    activity: [{ sequence: 1 }],
    ...overrides,
  };
}

describe("presentProvisioningAttemptClock", () => {
  it("uses Attempt n · elapsed t for attempt 2 and later", () => {
    const clock = presentProvisioningAttemptClock(
      progress({
        attemptNumber: 2,
        attemptStartedAt: "2026-10-31T00:00:00.000Z",
        startedAt: "2026-10-27T00:00:00.000Z",
      }),
      Date.parse("2026-10-31T00:01:05.000Z"),
    );
    expect(clock.primary).toBe("Attempt 2 · elapsed 1m 5s");
    expect(clock.firstStarted).toBeTruthy();
    expect(clock.firstStarted).not.toMatch(/^First started /);
  });

  it("keeps a single attempt as Elapsed t", () => {
    const clock = presentProvisioningAttemptClock(
      progress({ attemptNumber: 1, attemptStartedAt: "2026-10-31T00:00:00.000Z" }),
      Date.parse("2026-10-31T00:00:12.000Z"),
    );
    expect(clock.primary).toBe("Elapsed 12s");
    expect(clock.showAttemptLabel).toBe(false);
    expect(clock.firstStarted).toBeNull();
  });

  it("shows Attempt clock unavailable when attempt 2 has no attemptStartedAt", () => {
    const clock = presentProvisioningAttemptClock(
      progress({ attemptNumber: 3, attemptStartedAt: null }),
      Date.parse("2026-10-31T00:00:00.000Z"),
    );
    expect(clock.primary).toBe("Attempt 3");
    expect(clock.elapsedUnknown).toBe(true);
    expect(UNKNOWN_ATTEMPT_CLOCK_LABEL).toBe("Attempt clock unavailable");
  });
});

describe("unmapped snapshots", () => {
  const allUnknown: ManagedProvisioningProgress = progress({
    currentStage: null,
    stages: STAGE_CODES.map((code) => ({ code, status: "unknown" })),
  });

  it("treats Control's all-unknown shape as unmapped", () => {
    expect(isUnmappedProvisioningSnapshot(allUnknown)).toBe(true);
  });

  it("does not let an older unmapped snapshot replace a fresher one", () => {
    const current = progress({ lastUpdatedAt: "2026-10-31T02:00:00.000Z" });
    const olderUnknown = {
      ...allUnknown,
      lastUpdatedAt: "2026-10-31T01:00:00.000Z",
      activity: [{ sequence: 0 }],
    };
    expect(shouldAdoptManagedProvisioningProgress(current, olderUnknown)).toBe(false);
  });
});
