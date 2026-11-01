export const EMPTY_OPERATION_ID = "00000000-0000-0000-0000-000000000000";

export const PARKED_ENGINE_GUIDANCE_WITH_REFERENCE =
  "The last change to this engine didn't finish on its own. Email hello@valence.works with reference {operationId} and we'll help during business hours.";

export const PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE =
  "The last change to this engine didn't finish on its own. Email hello@valence.works with this engine's name and we'll help during business hours.";

export const PARKED_DELETE_GUIDANCE_WITH_REFERENCE =
  "Deletion of this engine didn't finish on its own. Email hello@valence.works with reference {operationId} and we'll help during business hours.";

export const PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE =
  "Deletion of this engine didn't finish on its own. Email hello@valence.works with this engine's name and we'll help during business hours.";

const NOT_AUTHORIZED_REASON_CODE = "not-authorized";

export function isUsableOperationId(operationId?: string | null): operationId is string {
  if (operationId == null) return false;
  const id = operationId.trim();
  return id.length > 0 && id.toLowerCase() !== EMPTY_OPERATION_ID;
}

function formatParkedGuidance(
  withReference: string,
  withoutReference: string,
  operationId?: string | null,
): string {
  if (!isUsableOperationId(operationId)) return withoutReference;
  return withReference.replace("{operationId}", operationId.trim());
}

export function formatParkedEngineGuidance(operationId?: string | null): string {
  return formatParkedGuidance(
    PARKED_ENGINE_GUIDANCE_WITH_REFERENCE,
    PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE,
    operationId,
  );
}

export function formatParkedDeleteGuidance(operationId?: string | null): string {
  return formatParkedGuidance(
    PARKED_DELETE_GUIDANCE_WITH_REFERENCE,
    PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE,
    operationId,
  );
}

export function isParkedLifecycle(observedLifecycle?: string | null): boolean {
  const normalized = observedLifecycle?.trim().toLowerCase() ?? "";
  return normalized === "recoveryrequired" || normalized === "recovery-required";
}

/** Control's IsParkedCustomerDelete: Delete + RecoveryRequired + RequiresHumanAt.
 *  Absent or null requiresHumanAt is not parked. Only a non-empty timestamp is. */
export function isParkedCustomerDelete(operation?: {
  action?: string | null;
  state?: string | null;
  requiresHumanAt?: string | null;
} | null): boolean {
  if (operation?.action !== "Delete" || operation.state !== "RecoveryRequired") return false;
  const parkedAt = operation.requiresHumanAt?.trim();
  return Boolean(parkedAt) && Number.isFinite(Date.parse(parkedAt));
}

export function isParkedEngine(
  observedLifecycle?: string | null,
  operation?: { action?: string | null; state?: string | null; requiresHumanAt?: string | null } | null,
): boolean {
  return isParkedLifecycle(observedLifecycle) || isParkedCustomerDelete(operation);
}

function shouldPassThroughParkReason(
  unavailableReason?: string | null,
  unavailableReasonCode?: string | null,
): unavailableReason is string {
  return Boolean(unavailableReason) && unavailableReasonCode !== NOT_AUTHORIZED_REASON_CODE;
}

/** Show Control's sentence exactly unless it is missing or not-authorized. */
export function controlReasonOrFallback(
  fallback: string,
  unavailableReason?: string | null,
  unavailableReasonCode?: string | null,
): string {
  return shouldPassThroughParkReason(unavailableReason, unavailableReasonCode)
    ? unavailableReason
    : fallback;
}

export function parkedEngineGuidance(
  unavailableReason?: string | null,
  unavailableReasonCode?: string | null,
  operationId?: string | null,
): string {
  return controlReasonOrFallback(
    formatParkedEngineGuidance(operationId),
    unavailableReason,
    unavailableReasonCode,
  );
}

export function parkedDeleteGuidance(
  unavailableReason?: string | null,
  unavailableReasonCode?: string | null,
  operationId?: string | null,
): string {
  return controlReasonOrFallback(
    formatParkedDeleteGuidance(operationId),
    unavailableReason,
    unavailableReasonCode,
  );
}
