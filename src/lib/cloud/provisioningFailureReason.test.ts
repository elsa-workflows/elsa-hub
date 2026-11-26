import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";
import {
  ENGINE_SETUP_STOPPED_TITLE,
  PROVISIONING_FAILURE_FALLBACK_LINE,
  PROVISIONING_NEXT_STEP_NEITHER,
  PROVISIONING_NEXT_STEP_RETRY_ONLY,
  PROVISIONING_REASON_CODES,
  RETRY_SETUP_BUTTON_LABEL,
  provisioningFailureBodyLines,
  provisioningFailureCopy,
  resolveProvisioningReasonCode,
} from "./provisioningFailureReason";

const here = dirname(fileURLToPath(import.meta.url));

const progress = (overrides: Partial<CloudProvisioningProgress> = {}): CloudProvisioningProgress => ({
  state: "failed",
  currentStage: "health-verification",
  startedAt: "2026-11-26T10:00:00.000Z",
  lastUpdatedAt: "2026-11-26T10:30:00.000Z",
  completedAt: null,
  diagnosticCode: null,
  stages: [],
  activity: [],
  ...overrides,
});

const engine = (overrides: Partial<CloudEngineOverview> = {}): CloudEngineOverview => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Prod",
  slug: "prod",
  status: "Failed",
  release: null,
  health: "Unknown",
  canOpen: false,
  version: 3,
  etag: null,
  organizationId: null,
  audience: null,
  redirectUri: null,
  activeOperation: null,
  lastOperation: null,
  allowedActions: {
    restart: { allowed: false, reasonCode: "instance.failed" },
    applyRelease: { allowed: false, reasonCode: "instance.failed" },
    open: { allowed: false, reasonCode: null },
    delete: { allowed: true, reasonCode: null },
  },
  ...overrides,
});

// Launch's signed strings (elsa-control#1011 comment 7193474184), byte for byte.
const SIGNED = {
  "provisioning.timeout.foundation": "Setup ran out of time while preparing your engine's infrastructure.",
  "provisioning.timeout.workload": "Setup ran out of time while starting your engine.",
  "provisioning.timeout.health": "Setup ran out of time while checking that your engine is healthy.",
  "provisioning.health.crash-loop": "Your engine kept stopping during startup, so it never became healthy.",
} as const;

describe("provisioningFailureCopy (#1011)", () => {
  it.each(PROVISIONING_REASON_CODES)("failed + %s shows the title and its signed body line", (code) => {
    const copy = provisioningFailureCopy(progress({ reasonCode: code }), engine());
    expect(copy).toEqual({
      title: "Engine setup stopped",
      body: SIGNED[code],
      nextStep: "For help, email hello@valence.works.",
      showRetry: false,
    });
  });

  it("maps exactly the four signed codes", () => {
    expect([...PROVISIONING_REASON_CODES].sort()).toEqual(Object.keys(SIGNED).sort());
    expect(provisioningFailureBodyLines).toEqual(SIGNED);
  });

  it("failed + unknown code shows the fallback line, never the crash-loop line", () => {
    for (const code of ["provisioning.timeout.network", "azure.step.workload.failed", "translator.finding"]) {
      const copy = provisioningFailureCopy(progress({ reasonCode: code }), engine());
      expect(copy?.title).toBe(ENGINE_SETUP_STOPPED_TITLE);
      expect(copy?.body).toBe("Setup stopped before your engine was ready.");
      expect(copy?.body).not.toBe(SIGNED["provisioning.health.crash-loop"]);
    }
  });

  it("failed with no reasonCode anywhere shows the title and the fallback line", () => {
    expect(provisioningFailureCopy(progress(), engine())).toEqual({
      title: "Engine setup stopped",
      body: "Setup stopped before your engine was ready.",
      nextStep: "For help, email hello@valence.works.",
      showRetry: false,
    });
  });

  it("a Failed (terminal) operation does not suppress the table", () => {
    const copy = provisioningFailureCopy(progress(), engine({
      activeOperation: { id: "22222222-2222-4222-8222-222222222222", action: "Create", state: "Failed" },
    }));
    expect(copy?.title).toBe(ENGINE_SETUP_STOPPED_TITLE);
  });

  it("stale with a code never shows the title", () => {
    for (const code of PROVISIONING_REASON_CODES) {
      expect(provisioningFailureCopy(progress({ state: "stale", reasonCode: code }), engine())).toBeNull();
    }
  });

  it.each(["active", "queued", "waiting-for-prior-operation", "entitlement-held", "ready", "unavailable", "Failed"])(
    "progress state %s with a timeout code never shows the title",
    (state) => {
      expect(provisioningFailureCopy(
        progress({ state, reasonCode: "provisioning.timeout.workload" }),
        engine(),
      )).toBeNull();
    },
  );

  it.each(["Accepted", "WaitingForPriorOperation", "Queued", "EntitlementHeld", "Running", "RecoveryRequired"])(
    "a %s (running or retrying) operation with a timeout code never shows the title",
    (state) => {
      const copy = provisioningFailureCopy(
        progress({ reasonCode: "provisioning.timeout.foundation" }),
        engine({
          activeOperation: {
            id: "22222222-2222-4222-8222-222222222222",
            action: "Create",
            state,
            progress: {
              phase: null,
              attemptedStep: "Foundation",
              attemptNumber: 2,
              attemptStartedAt: null,
              reasonCode: "provisioning.timeout.foundation",
            },
          },
        }),
      );
      expect(copy).toBeNull();
    },
  );

  it("reads the code from lastOperation, then activeOperation.progress, when progress has none", () => {
    expect(resolveProvisioningReasonCode(progress(), engine({
      lastOperation: {
        action: "Create",
        state: "Failed",
        completedAt: null,
        failureCode: "instance.failed",
        reasonCode: "provisioning.timeout.health",
      },
    }))).toBe("provisioning.timeout.health");
    expect(resolveProvisioningReasonCode(progress(), engine({
      activeOperation: {
        id: "22222222-2222-4222-8222-222222222222",
        action: "Create",
        state: "Failed",
        progress: {
          phase: null,
          attemptedStep: null,
          attemptNumber: null,
          attemptStartedAt: null,
          reasonCode: "provisioning.health.crash-loop",
        },
      },
    }))).toBe("provisioning.health.crash-loop");
    expect(resolveProvisioningReasonCode(
      progress({ reasonCode: "provisioning.timeout.workload" }),
      engine({
        lastOperation: {
          action: "Create",
          state: "Failed",
          completedAt: null,
          failureCode: null,
          reasonCode: "provisioning.timeout.health",
        },
      }),
    )).toBe("provisioning.timeout.workload");
    expect(provisioningFailureCopy(progress(), engine({
      lastOperation: {
        action: "Create",
        state: "Failed",
        completedAt: null,
        failureCode: null,
        reasonCode: "provisioning.timeout.health",
      },
    }))?.body).toBe(SIGNED["provisioning.timeout.health"]);
  });

  it("payloads missing every new key resolve to no code and still parse", () => {
    expect(resolveProvisioningReasonCode(undefined, undefined)).toBeNull();
    expect(resolveProvisioningReasonCode(progress(), engine())).toBeNull();
    expect(provisioningFailureCopy(undefined, engine())).toBeNull();
    expect(provisioningFailureCopy(progress({ state: "active" }), engine())).toBeNull();
    expect(provisioningFailureCopy(progress(), engine())?.body).toBe(PROVISIONING_FAILURE_FALLBACK_LINE);
  });

  it("offers the Retry-only row only when retry is explicitly allowed; never via restart; never Delete", () => {
    const restartAllowed = engine({
      allowedActions: {
        restart: { allowed: true, reasonCode: null },
        applyRelease: { allowed: true, reasonCode: null },
        open: { allowed: false, reasonCode: null },
        delete: { allowed: true, reasonCode: null },
      },
    });
    // Restart/applyRelease being allowed does not turn on Retry.
    const notMapped = provisioningFailureCopy(progress({ reasonCode: "provisioning.health.crash-loop" }), restartAllowed);
    expect(notMapped?.nextStep).toBe(PROVISIONING_NEXT_STEP_NEITHER);
    expect(notMapped?.showRetry).toBe(false);
    const withRetry = provisioningFailureCopy(
      progress({ reasonCode: "provisioning.health.crash-loop" }),
      engine(),
      { retryAllowed: true },
    );
    expect(withRetry?.nextStep).toBe("Retry setup, or email hello@valence.works.");
    expect(withRetry?.showRetry).toBe(true);
    // Delete-only shows the Neither row until #1012.
    expect(provisioningFailureCopy(progress({ reasonCode: "x.y" }), engine())?.nextStep)
      .toBe(PROVISIONING_NEXT_STEP_NEITHER);
  });

  it("ships only signed, straight-apostrophe, Delete-free copy", () => {
    const strings = [
      ENGINE_SETUP_STOPPED_TITLE,
      ...Object.values(provisioningFailureBodyLines),
      PROVISIONING_FAILURE_FALLBACK_LINE,
      PROVISIONING_NEXT_STEP_RETRY_ONLY,
      PROVISIONING_NEXT_STEP_NEITHER,
      RETRY_SETUP_BUTTON_LABEL,
    ];
    const source = readFileSync(join(here, "provisioningFailureReason.ts"), "utf8");
    for (const text of [...strings, source]) {
      expect(text).not.toMatch(/[\u2018\u2019\u201C\u201D]/);
    }
    for (const text of strings) {
      expect(text).not.toMatch(/delete|failed|error|temporarily|soon|in a moment/i);
    }
    expect(source).not.toMatch(/Delete engine|delete this engine/);
  });
});
