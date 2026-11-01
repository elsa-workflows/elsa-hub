import { describe, expect, it } from "vitest";
import {
  EMPTY_OPERATION_ID,
  PARKED_DELETE_GUIDANCE_WITH_REFERENCE,
  PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE,
  PARKED_ENGINE_GUIDANCE_WITH_REFERENCE,
  PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE,
  controlReasonOrFallback,
  formatParkedDeleteGuidance,
  formatParkedEngineGuidance,
  isParkedCustomerDelete,
  isParkedEngine,
  parkedDeleteGuidance,
  parkedEngineGuidance,
} from "./parkedGuidance";

const OPERATION_ID = "11111111-1111-4111-8111-111111111111";

describe("parkedGuidance", () => {
  it("keeps the four signed parked strings", () => {
    expect(PARKED_ENGINE_GUIDANCE_WITH_REFERENCE).toBe(
      "The last change to this engine didn't finish on its own. Email hello@valence.works with reference {operationId} and we'll help during business hours.",
    );
    expect(PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE).toBe(
      "The last change to this engine didn't finish on its own. Email hello@valence.works with this engine's name and we'll help during business hours.",
    );
    expect(PARKED_DELETE_GUIDANCE_WITH_REFERENCE).toBe(
      "Deletion of this engine didn't finish on its own. Email hello@valence.works with reference {operationId} and we'll help during business hours.",
    );
    expect(PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE).toBe(
      "Deletion of this engine didn't finish on its own. Email hello@valence.works with this engine's name and we'll help during business hours.",
    );
  });

  it("formats a reference only for a usable operation id", () => {
    expect(formatParkedEngineGuidance(OPERATION_ID)).toBe(
      PARKED_ENGINE_GUIDANCE_WITH_REFERENCE.replace("{operationId}", OPERATION_ID),
    );
    expect(formatParkedEngineGuidance(EMPTY_OPERATION_ID)).toBe(PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE);
    expect(formatParkedEngineGuidance("")).toBe(PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE);
    expect(formatParkedDeleteGuidance(null)).toBe(PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE);
  });

  it("treats RecoveryRequired lifecycle or a parked delete as parked", () => {
    expect(isParkedEngine("RecoveryRequired", null)).toBe(true);
    expect(isParkedCustomerDelete({
      action: "Delete",
      state: "RecoveryRequired",
      requiresHumanAt: "2026-10-20T00:00:00.000Z",
    })).toBe(true);
    expect(isParkedCustomerDelete({
      action: "Delete",
      state: "RecoveryRequired",
      requiresHumanAt: null,
    })).toBe(false);
    expect(isParkedEngine("Ready", { action: "Create", state: "Succeeded" })).toBe(false);
  });

  it("uses parked engine copy for Create, Restart, Reconcile, Recover, and unknown actions", () => {
    const expected = formatParkedEngineGuidance(OPERATION_ID);
    for (const action of ["Create", "Restart", "Reconcile", "Recover", "Unknown", undefined] as const) {
      const operation = {
        action,
        state: "RecoveryRequired",
        requiresHumanAt: "2026-10-20T00:00:00.000Z",
      };
      expect(isParkedCustomerDelete(operation)).toBe(false);
      expect(isParkedEngine("RecoveryRequired", operation)).toBe(true);
      expect(parkedEngineGuidance(null, null, OPERATION_ID)).toBe(expected);
    }
    expect(parkedDeleteGuidance(null, null, OPERATION_ID)).toBe(
      formatParkedDeleteGuidance(OPERATION_ID),
    );
  });

  it("passes Control unavailableReason through except not-authorized", () => {
    expect(controlReasonOrFallback("fallback", "Control wrote this.", "provider-timeout")).toBe(
      "Control wrote this.",
    );
    expect(parkedEngineGuidance("Control wrote this.", "not-authorized", OPERATION_ID)).toBe(
      formatParkedEngineGuidance(OPERATION_ID),
    );
    expect(parkedDeleteGuidance(null, null, OPERATION_ID)).toBe(formatParkedDeleteGuidance(OPERATION_ID));
  });
});
