import {
  ENGINE_SETUP_STOPPED_TITLE,
  PROVISIONING_FAILURE_FALLBACK_LINE,
  PROVISIONING_NEXT_STEP_NEITHER,
  PROVISIONING_NEXT_STEP_RETRY_ONLY,
  provisioningFailureBodyLines,
  type ProvisioningReasonCode,
} from "@/lib/cloud/provisioningFailureReason";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";
import { isSetupFailure, usableOperationId } from "@/lib/cloud/enginePresentation";
import {
  CLOUD_ACTION_CATALOG_UNAVAILABLE,
  CLOUD_ACTION_CHANGE_IN_PROGRESS,
  CLOUD_ACTION_CHANGED_SINCE_READ,
  CLOUD_ACTION_DELETE_CONFIRMATION_INVALID,
  CLOUD_ACTION_FALLBACK,
  CLOUD_ACTION_IDEMPOTENCY_CONFLICT,
  CLOUD_ACTION_PERMISSION,
  CLOUD_ACTION_PERMISSION_DELETE,
  CLOUD_ACTION_RATE_LIMIT,
  CLOUD_ACTION_SIGN_IN_AGAIN,
  CLOUD_ACTION_SLUG_CONFLICT,
  CLOUD_ACTION_VERSION_CONFLICT,
  CLOUD_CHIP_NO_ACTIVE_PLAN,
  CLOUD_DELETE_START_FALLBACK,
  CLOUD_LIMIT_MESSAGE_SIGNED,
  CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT,
  CLOUD_REASON_DELETING_BODY,
  CLOUD_REASON_GENERIC_FALLBACK,
  CLOUD_REASON_HANDOFF_UNAVAILABLE,
  CLOUD_REASON_IDENTITY_UNAVAILABLE,
  CLOUD_REASON_IN_PROGRESS_CHANGE,
  CLOUD_REASON_NEITHER_NEXT,
  CLOUD_REASON_NO_ACTIVE_PLAN,
  CLOUD_REASON_RESTART_NEXT,
  CLOUD_REASON_STATUS_CANT_BE_DETERMINED,
  CLOUD_REASON_STATUS_CANT_BE_LOADED,
  CLOUD_REASON_UNAVAILABLE_BODY,
  CLOUD_STATUS_NOT_AVAILABLE,
  CLOUD_STATUS_SETUP_STOPPED,
  heldDeleteLine,
  parkedChangeLine,
  parkedDeleteLine,
} from "@/lib/cloudClient/signedCopy";
import { CLOUD_DELETE_IN_PROGRESS } from "@/lib/cloudClient/copy";

export type CloudActionKind = "delete" | "restart" | "apply" | "create" | "other";

export type ReasonCopy = {
  chip?: string;
  title?: string;
  body: string;
  nextStep?: string | null;
};

const PROVISIONING_REASON: Record<string, string> = { ...provisioningFailureBodyLines };
const SETUP_STAGE_PREFIXES = ["azure.", "provider.submission.rejected", "provisioning."];

const PARKED_DELETE_CODES = new Set([
  "delete-parked",
  "deletion.provider-cleanup-pending",
  "lifecycle.deletion.provider-progress-stale",
]);

const COMMERCIAL_CODES = new Set([
  "instance.entitlement-required",
  "instance.entitlement-expired",
  "instance.subscription-state-required",
]);

const LIMIT_CODES = new Set(["instance.instance-limit-reached", "instance_limit_reached"]);

function restartNext(engine?: Pick<CloudEngineOverview, "allowedActions"> | null): string {
  return engine?.allowedActions.restart.allowed ? CLOUD_REASON_RESTART_NEXT : CLOUD_REASON_NEITHER_NEXT;
}

/** Launch E: Restart next-step only when restart is allowed. Otherwise generic only. */
function nonSetupFailedCopy(engine?: Pick<CloudEngineOverview, "allowedActions"> | null): ReasonCopy {
  if (engine?.allowedActions.restart.allowed) {
    return { body: CLOUD_REASON_GENERIC_FALLBACK, nextStep: CLOUD_REASON_RESTART_NEXT };
  }
  return { body: CLOUD_REASON_GENERIC_FALLBACK };
}

function operationIdFrom(engine?: Pick<CloudEngineOverview, "activeOperation"> | null): string | null {
  return usableOperationId(engine?.activeOperation?.id);
}

function isKnownProvisioningReason(code: string): code is ProvisioningReasonCode {
  return code in PROVISIONING_REASON;
}

function setupFailureCopy(
  reasonCode?: string | null,
  retryAllowed?: boolean,
): ReasonCopy {
  const body = reasonCode && isKnownProvisioningReason(reasonCode)
    ? PROVISIONING_REASON[reasonCode]
    : PROVISIONING_FAILURE_FALLBACK_LINE;
  return {
    chip: CLOUD_STATUS_SETUP_STOPPED,
    title: ENGINE_SETUP_STOPPED_TITLE,
    body,
    nextStep: retryAllowed ? PROVISIONING_NEXT_STEP_RETRY_ONLY : PROVISIONING_NEXT_STEP_NEITHER,
  };
}

function isSetupStageCode(code: string): boolean {
  return SETUP_STAGE_PREFIXES.some((prefix) => code === prefix || code.startsWith(prefix));
}

/**
 * Maps a Control `unavailableReasonCode` (or a customer-safe operation code)
 * to signed copy. Never returns Control prose or the code itself. Returns
 * null when no line should be shown (Deleted banner, not-authorized).
 */
export function reasonCopyForCode(
  code: string | null | undefined,
  options: {
    engine?: CloudEngineOverview | null;
    progress?: CloudProvisioningProgress | null;
    operationId?: string | null;
  } = {},
): ReasonCopy | null {
  const { engine, progress } = options;
  const operationId = options.operationId ?? operationIdFrom(engine);
  const resolved = code?.trim() || "";

  if (engine?.status === "Deleted") return null;
  if (resolved === "not-authorized") return null;

  if (engine?.status === "Failed") {
    if (isSetupFailure(engine.status, engine.lastOperation)) {
      const reasonCode = progress?.reasonCode
        ?? engine.lastOperation?.reasonCode
        ?? engine.activeOperation?.progress?.reasonCode
        ?? (isKnownProvisioningReason(resolved) || isSetupStageCode(resolved) ? resolved : null);
      return setupFailureCopy(reasonCode, false);
    }
    return nonSetupFailedCopy(engine);
  }

  if (resolved === "delete-held" || (engine?.activeOperation?.action === "Delete" && engine.activeOperation.state === "EntitlementHeld")) {
    return { body: heldDeleteLine(operationId) };
  }

  if (
    PARKED_DELETE_CODES.has(resolved)
    || (resolved === "instance.recovery-required" && engine?.activeOperation?.action === "Delete")
    || (engine?.activeOperation?.action === "Delete" && engine.activeOperation.state === "RecoveryRequired")
  ) {
    return { body: parkedDeleteLine(operationId) };
  }

  if (engine?.status === "RecoveryRequired" && engine.activeOperation?.action !== "Delete") {
    return { body: parkedChangeLine(operationId) };
  }

  if (engine?.status === "Deleting" || engine?.activeOperation?.action === "Delete") {
    if (engine.activeOperation?.state !== "EntitlementHeld" && engine.activeOperation?.state !== "RecoveryRequired") {
      return { title: "Deleting this engine", body: CLOUD_REASON_DELETING_BODY, nextStep: null };
    }
  }

  if (engine && ["Pending", "Provisioning", "Updating", "Stopping"].includes(engine.status)) {
    return { body: CLOUD_REASON_IN_PROGRESS_CHANGE, nextStep: null };
  }

  if (!resolved) {
    return { body: CLOUD_REASON_GENERIC_FALLBACK };
  }

  if (resolved === "instance.unavailable") {
    return {
      chip: CLOUD_STATUS_NOT_AVAILABLE,
      body: CLOUD_REASON_UNAVAILABLE_BODY,
      nextStep: restartNext(engine),
    };
  }

  if (resolved === "instance.failed") {
    if (isSetupFailure(engine?.status, engine?.lastOperation) || progress?.state === "failed") {
      const reasonCode = progress?.reasonCode
        ?? engine?.lastOperation?.reasonCode
        ?? engine?.activeOperation?.progress?.reasonCode
        ?? null;
      return setupFailureCopy(reasonCode, false);
    }
    return nonSetupFailedCopy(engine);
  }

  if (resolved === "provider-timeout") {
    return { body: CLOUD_REASON_STATUS_CANT_BE_LOADED };
  }

  if (resolved === "delete-pending" || (engine?.status === "Deleting" && resolved === "instance.provisioning")) {
    return { title: "Deleting this engine", body: CLOUD_REASON_DELETING_BODY, nextStep: null };
  }

  if (resolved === "delete-held" || (engine?.activeOperation?.action === "Delete" && engine.activeOperation.state === "EntitlementHeld")) {
    return { body: heldDeleteLine(operationId) };
  }

  if (PARKED_DELETE_CODES.has(resolved) || (resolved === "instance.recovery-required" && engine?.activeOperation?.action === "Delete")) {
    return { body: parkedDeleteLine(operationId) };
  }

  if (resolved === "instance.provisioning") {
    return { body: CLOUD_REASON_IN_PROGRESS_CHANGE, nextStep: null };
  }

  if (resolved === "instance.recovery-required") {
    return { body: parkedChangeLine(operationId) };
  }

  if (resolved === "instance.unknown") {
    return { body: CLOUD_REASON_STATUS_CANT_BE_DETERMINED };
  }

  if (resolved === "handoff-unavailable") {
    return { body: CLOUD_REASON_HANDOFF_UNAVAILABLE };
  }

  if (resolved === "identity-unavailable") {
    return { body: CLOUD_REASON_IDENTITY_UNAVAILABLE };
  }

  if (resolved === "lifecycle.deletion.blocked-by-operation-in-flight") {
    return { body: CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT, nextStep: null };
  }

  if ((isKnownProvisioningReason(resolved) || isSetupStageCode(resolved))
    && (progress?.state === "failed" || isSetupFailure(engine?.status, engine?.lastOperation))) {
    return setupFailureCopy(resolved, false);
  }

  if (COMMERCIAL_CODES.has(resolved)) {
    return { chip: CLOUD_CHIP_NO_ACTIVE_PLAN, body: CLOUD_REASON_NO_ACTIVE_PLAN };
  }

  if (LIMIT_CODES.has(resolved)) {
    return { body: CLOUD_LIMIT_MESSAGE_SIGNED };
  }

  return { body: CLOUD_REASON_GENERIC_FALLBACK };
}

export function overviewReasonCopy(engine: CloudEngineOverview, progress?: CloudProvisioningProgress | null): ReasonCopy | null {
  if (engine.status === "Deleted") return null;
  if (engine.unavailableReasonCode === "not-authorized") return null;
  const code = engine.unavailableReasonCode
    ?? engine.activeOperation?.progress?.reasonCode
    ?? engine.lastOperation?.reasonCode
    ?? engine.lastOperation?.failureCode
    ?? null;
  return reasonCopyForCode(code, { engine, progress });
}

export function signedActionErrorLine(
  result: unknown,
  kind: CloudActionKind = "other",
): string | null {
  if (!result || typeof result !== "object" || !("ok" in result) || result.ok) return null;
  const code = "code" in result && typeof result.code === "string" ? result.code : "";

  if (code === "instance.operation-active" || code === "delete_in_progress") {
    return kind === "delete" ? CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT : CLOUD_ACTION_CHANGE_IN_PROGRESS;
  }
  if (code === "instance.deleting") return CLOUD_DELETE_IN_PROGRESS;
  if (
    code === "instance.delete-confirmation-invalid"
    || code === "instance.delete-confirmation-required"
    || code === "delete_confirmation_invalid"
  ) {
    return CLOUD_ACTION_DELETE_CONFIRMATION_INVALID;
  }
  if (code === "instance.changed-since-read" || code === "changed_since_read") {
    return CLOUD_ACTION_CHANGED_SINCE_READ;
  }
  if (code === "instance.delete-permission-required" || code === "forbidden") {
    return kind === "delete" ? CLOUD_ACTION_PERMISSION_DELETE : CLOUD_ACTION_PERMISSION;
  }
  if (code === "instance.idempotency-conflict") return CLOUD_ACTION_IDEMPOTENCY_CONFLICT;
  if (code === "instance.slug-conflict") return CLOUD_ACTION_SLUG_CONFLICT;
  if (code === "instance.version-conflict") return CLOUD_ACTION_VERSION_CONFLICT;
  if (code === "instance.catalog-selection-unavailable") return CLOUD_ACTION_CATALOG_UNAVAILABLE;
  if (code === "rate-limit.exceeded") return CLOUD_ACTION_RATE_LIMIT;
  if (LIMIT_CODES.has(code)) return CLOUD_LIMIT_MESSAGE_SIGNED;
  if (code === "unauthorized" || code === "sessions_required" || code === "reauthentication_required") {
    return CLOUD_ACTION_SIGN_IN_AGAIN;
  }
  if (kind === "delete") return CLOUD_DELETE_START_FALLBACK;
  return CLOUD_ACTION_FALLBACK;
}
