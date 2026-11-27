import { afterEach, describe, expect, it } from "vitest";
import { CLOUD_LIMIT_MESSAGE } from "@/lib/cloud";
import { overviewReasonCopy, reasonCopyForCode, signedActionErrorLine } from "./reasonCopy";
import {
  controlDeletedOverview,
  controlFailedAfterReadyOverview,
  controlFailedSetupOverview,
  controlFailedWithoutOperationOverview,
  controlHeldDeleteOverview,
  controlParkedDeleteOverview,
} from "./controlOverview.fixtures";
import {
  CLOUD_ACTION_FALLBACK,
  CLOUD_ACTION_PERMISSION,
  CLOUD_ACTION_PERMISSION_DELETE,
  CLOUD_LIMIT_MESSAGE_SIGNED,
  CLOUD_REASON_DELETING_BODY,
  CLOUD_REASON_GENERIC_FALLBACK,
  CLOUD_REASON_IDENTITY_UNAVAILABLE,
  CLOUD_REASON_RESTART_NEXT,
  CLOUD_REASON_UNAVAILABLE_BODY,
  heldDeleteLine,
  parkedDeleteLine,
} from "@/lib/cloudClient/signedCopy";
import { setCloudSignedCopyEnabledForTests } from "@/lib/cloudClient/signedCopyFlag";
import { PROVISIONING_FAILURE_FALLBACK_LINE, provisioningFailureBodyLines } from "./provisioningFailureReason";

afterEach(() => setCloudSignedCopyEnabledForTests(undefined));

describe("reasonCopyForCode with Control overview shapes", () => {
  it("hides the reason line on a Deleted engine, even though Control sends instance.unavailable", () => {
    const engine = controlDeletedOverview();
    expect(engine.unavailableReasonCode).toBe("instance.unavailable");
    expect(overviewReasonCopy(engine)).toBeNull();
  });

  it("maps instance.unavailable on a non-deleted engine and offers Restart only when the setting is on and allowed", () => {
    const engine = controlDeletedOverview({
      status: "Ready",
      health: "Degraded",
      lastOperation: null,
      allowedActions: {
        restart: { allowed: true, reasonCode: null },
        applyRelease: { allowed: false, reasonCode: "instance.unavailable" },
        open: { allowed: false, reasonCode: "instance.unavailable" },
        delete: { allowed: true, reasonCode: null },
      },
    });
    expect(overviewReasonCopy(engine)).toEqual({
      body: CLOUD_REASON_UNAVAILABLE_BODY,
      nextStep: null,
    });
    setCloudSignedCopyEnabledForTests(true);
    expect(overviewReasonCopy(engine)).toEqual({
      body: CLOUD_REASON_UNAVAILABLE_BODY,
      nextStep: CLOUD_REASON_RESTART_NEXT,
    });
    engine.allowedActions.restart.allowed = false;
    expect(overviewReasonCopy(engine)?.nextStep).toBe("For help, email hello@valence.works.");
  });

  it("treats Failed + lastOperation Create as a setup failure with the #1011 line", () => {
    const engine = controlFailedSetupOverview();
    const copy = overviewReasonCopy(engine);
    expect(copy?.body).toBe(provisioningFailureBodyLines["provisioning.timeout.workload"]);
    expect(copy?.body).not.toBe(engine.unavailableReason);
  });

  it("treats Failed + lastOperation Restart, or no lastOperation, as the generic fallback, with Launch E only when the setting is on", () => {
    expect(overviewReasonCopy(controlFailedAfterReadyOverview())).toEqual({
      body: CLOUD_REASON_GENERIC_FALLBACK,
    });
    expect(overviewReasonCopy(controlFailedWithoutOperationOverview())).toEqual({
      body: CLOUD_REASON_GENERIC_FALLBACK,
    });
    setCloudSignedCopyEnabledForTests(true);
    expect(overviewReasonCopy(controlFailedAfterReadyOverview())).toEqual({
      body: CLOUD_REASON_GENERIC_FALLBACK,
      nextStep: CLOUD_REASON_RESTART_NEXT,
    });
    expect(overviewReasonCopy(controlFailedAfterReadyOverview({
      allowedActions: {
        restart: { allowed: false, reasonCode: "instance.failed" },
        applyRelease: { allowed: false, reasonCode: "instance.failed" },
        open: { allowed: false, reasonCode: "instance.failed" },
        delete: { allowed: false, reasonCode: "instance.failed" },
      },
    }))).toEqual({
      body: CLOUD_REASON_GENERIC_FALLBACK,
    });
  });

  it("maps a parked Control delete by deletion.provider-cleanup-pending, not a Hub alias", () => {
    const engine = controlParkedDeleteOverview();
    expect(overviewReasonCopy(engine)?.body).toBe(
      parkedDeleteLine("22222222-2222-4222-8222-222222222222"),
    );
    expect(overviewReasonCopy(engine)?.body).not.toContain("business hours");
    expect(overviewReasonCopy(engine)?.body).not.toBe(engine.unavailableReason);
  });

  it("maps an EntitlementHeld delete to the held lines", () => {
    const engine = controlHeldDeleteOverview();
    expect(overviewReasonCopy(engine)?.body).toBe(
      heldDeleteLine("22222222-2222-4222-8222-222222222222"),
    );
  });

  it("never returns Control prose or the code itself", () => {
    const engine = controlDeletedOverview({ status: "Ready", lastOperation: null });
    const copy = overviewReasonCopy(engine);
    expect(copy?.body).not.toBe("This instance is not currently available.");
    expect(JSON.stringify(copy)).not.toContain("instance.unavailable");
  });

  it("uses the generic fallback for an unmapped code", () => {
    expect(reasonCopyForCode("instance.binding-required")?.body).toBe(CLOUD_REASON_GENERIC_FALLBACK);
    expect(reasonCopyForCode("not-a-real-code")?.body).toBe(CLOUD_REASON_GENERIC_FALLBACK);
  });

  it("maps identity-unavailable to Launch's signed line only when the setting is on", () => {
    expect(reasonCopyForCode("identity-unavailable")?.body).toBe(CLOUD_REASON_GENERIC_FALLBACK);
    setCloudSignedCopyEnabledForTests(true);
    expect(reasonCopyForCode("identity-unavailable")?.body).toBe(CLOUD_REASON_IDENTITY_UNAVAILABLE);
  });
});


  it("shows no reason line for a healthy Ready engine when there is no code, flag on or off", () => {
    const ready = controlDeletedOverview({
      status: "Ready",
      health: "Healthy",
      canOpen: true,
      unavailableReason: undefined,
      unavailableReasonCode: undefined,
      lastOperation: null,
      allowedActions: {
        restart: { allowed: true, reasonCode: null },
        applyRelease: { allowed: true, reasonCode: null },
        open: { allowed: true, reasonCode: null },
        delete: { allowed: true, reasonCode: null },
      },
    });
    expect(overviewReasonCopy(ready)).toBeNull();
    expect(reasonCopyForCode(null, { engine: ready })).toBeNull();
    setCloudSignedCopyEnabledForTests(true);
    expect(overviewReasonCopy(ready)).toBeNull();
    ready.lastOperation = {
      action: "Restart",
      state: "Succeeded",
      completedAt: "2026-11-27T14:05:00.000Z",
      failureCode: null,
    };
    expect(overviewReasonCopy(ready)).toBeNull();
    setCloudSignedCopyEnabledForTests(false);
    expect(overviewReasonCopy(ready)).toBeNull();
  });

describe("signedActionErrorLine", () => {
  it("uses Launch's permission lines only when the setting is on", () => {
    expect(signedActionErrorLine({ ok: false, code: "forbidden" }, "restart")).toBe(CLOUD_ACTION_FALLBACK);
    setCloudSignedCopyEnabledForTests(true);
    expect(signedActionErrorLine({ ok: false, code: "forbidden" }, "restart")).toBe(CLOUD_ACTION_PERMISSION);
    expect(signedActionErrorLine({ ok: false, code: "forbidden" }, "delete")).toBe(CLOUD_ACTION_PERMISSION_DELETE);
    expect(signedActionErrorLine({ ok: false, code: "forbidden" }, "delete")).not.toContain("Ask a workspace admin");
  });

  it("uses the signed #948 v2 limit line only when the setting is on", () => {
    expect(signedActionErrorLine({ ok: false, code: "instance_limit_reached" })).not.toBe(CLOUD_LIMIT_MESSAGE_SIGNED);
    setCloudSignedCopyEnabledForTests(true);
    expect(signedActionErrorLine({ ok: false, code: "instance_limit_reached" })).toBe(CLOUD_LIMIT_MESSAGE_SIGNED);
  });
});
