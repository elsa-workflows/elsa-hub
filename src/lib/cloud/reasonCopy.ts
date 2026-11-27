import {
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
  CLOUD_DELETE_START_FALLBACK,
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
  heldDeleteLine,
  parkedChangeLine,
  parkedDeleteLine,
} from "@/lib/cloudClient/signedCopy";
import { CLOUD_DELETE_IN_PROGRESS, cloudLimitMessage } from "@/lib/cloudClient/copy";
import { isCloudSignedCopyEnabled } from "@/lib/cloudClient/signedCopyFlag";
import { formatParkedEngineGuidance } from "@/lib/cloud/parkedGuidance";

export type CloudActionKind = "delete" | "restart" | "apply" | "create" | "other";

export type ReasonCopy = {
  body: string;
  nextStep?: string | null;
};

const PROVISIONING_REASON = new Map<string, string>(Object.entries(provisioningFailureBodyLines));
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

function restartNext(engine?: Pick<CloudEngineOverview, "allowedActions"> | null): string | null {
  // Launch E stays behind the signed-copy setting.
  if (!isCloudSignedCopyEnabled()) return null;
  return engine?.allowedActions.restart.allowed ? CLOUD_REASON_RESTART_NEXT : CLOUD_REASON_NEITHER_NEXT;
}

/** Non-setup Failed: generic fallback always; Launch E next-step only when the setting is on. */
function nonSetupFailedCopy(engine?: Pick<CloudEngineOverview, "allowedActions"> | null): ReasonCopy {
  if (isCloudSignedCopyEnabled() && engine?.allowedActions.restart.allowed) {
    return { body: CLOUD_REASON_GENERIC_FALLBACK, nextStep: CLOUD_REASON_RESTART_NEXT };
  }
  return { body: CLOUD_REASON_GENERIC_FALLBACK };
}

function operationIdFrom(engine?: Pick<CloudEngineOverview, "activeOperation"> | null): string | null {
  return usableOperationId(engine?.activeOperation?.id);
}

function isKnownProvisioningReason(code: string): code is ProvisioningReasonCode {
  return PROVISIONING_REASON.has(code);
}

function setupFailureCopy(
  reasonCode?: string | null,
  retryAllowed?: boolean,
): ReasonCopy {
  const body = reasonCode && isKnownProvisioningReason(reasonCode)
    ? PROVISIONING_REASON.get(reasonCode) ?? PROVISIONING_FAILURE_FALLBACK_LINE
    : PROVISIONING_FAILURE_FALLBACK_LINE;
  return {
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
 * null when no line should be shown (Deleted banner, not-authorized, or a
 * healthy engine with no unavailable/problem code).
 *
 * Two passes: engine-state rules first, then one flat code lookup. A missing
 * code produces a line only when the engine state calls for one.
 */
const IN_PROGRESS_STATUSES = new Set(["Pending", "Provisioning", "Updating", "Stopping"]);

function parkedChangeBody(operationId: string | null): string {
  return isCloudSignedCopyEnabled()
    ? parkedChangeLine(operationId)
    : formatParkedEngineGuidance(operationId);
}

function identityUnavailableBody(): string {
  return isCloudSignedCopyEnabled()
    ? CLOUD_REASON_IDENTITY_UNAVAILABLE
    : CLOUD_REASON_GENERIC_FALLBACK;
}

type ReasonContext = {
  engine?: CloudEngineOverview | null;
  progress?: CloudProvisioningProgress | null;
  operationId: string | null;
};

function instanceFailedCopy({ engine, progress }: ReasonContext): ReasonCopy {
  if (isSetupFailure(engine?.status, engine?.lastOperation) || progress?.state === "failed") {
    const reasonCode = progress?.reasonCode
      ?? engine?.lastOperation?.reasonCode
      ?? engine?.activeOperation?.progress?.reasonCode
      ?? null;
    return setupFailureCopy(reasonCode, false);
  }
  return nonSetupFailedCopy(engine);
}

const REASON_BY_CODE = new Map<string, (ctx: ReasonContext) => ReasonCopy>([
  ["instance.unavailable", ({ engine }) => ({
    body: CLOUD_REASON_UNAVAILABLE_BODY,
    nextStep: restartNext(engine),
  })],
  ["instance.failed", instanceFailedCopy],
  ["provider-timeout", () => ({ body: CLOUD_REASON_STATUS_CANT_BE_LOADED })],
  ["delete-pending", () => ({ body: CLOUD_REASON_DELETING_BODY, nextStep: null })],
  ["instance.provisioning", () => ({ body: CLOUD_REASON_IN_PROGRESS_CHANGE, nextStep: null })],
  ["instance.recovery-required", ({ operationId }) => ({ body: parkedChangeBody(operationId) })],
  ["instance.unknown", () => ({ body: CLOUD_REASON_STATUS_CANT_BE_DETERMINED })],
  ["handoff-unavailable", () => ({ body: CLOUD_REASON_HANDOFF_UNAVAILABLE })],
  ["identity-unavailable", () => ({ body: identityUnavailableBody() })],
  ["lifecycle.deletion.blocked-by-operation-in-flight", () => ({
    body: CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT,
    nextStep: null,
  })],
]);

for (const code of COMMERCIAL_CODES) {
  REASON_BY_CODE.set(code, () => ({ body: CLOUD_REASON_NO_ACTIVE_PLAN }));
}
for (const code of LIMIT_CODES) {
  REASON_BY_CODE.set(code, () => ({ body: cloudLimitMessage() }));
}

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
  const ctx: ReasonContext = { engine, progress, operationId };

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

  const deleteOp = engine?.activeOperation?.action === "Delete";
  const deleteState = deleteOp ? engine?.activeOperation?.state : undefined;

  if (resolved === "delete-held" || deleteState === "EntitlementHeld") {
    return { body: heldDeleteLine(operationId) };
  }

  if (
    PARKED_DELETE_CODES.has(resolved)
    || (resolved === "instance.recovery-required" && deleteOp)
    || deleteState === "RecoveryRequired"
  ) {
    return { body: parkedDeleteLine(operationId) };
  }

  if (engine?.status === "Deleting" || deleteOp) {
    return { body: CLOUD_REASON_DELETING_BODY, nextStep: null };
  }

  if (engine?.status === "RecoveryRequired") {
    return { body: parkedChangeBody(operationId) };
  }

  if (engine && IN_PROGRESS_STATUSES.has(engine.status)) {
    return { body: CLOUD_REASON_IN_PROGRESS_CHANGE, nextStep: null };
  }

  if (!resolved) {
    // Only a healthy Ready engine (or no engine) has no line. Unknown and
    // Degraded still need the generic fallback when Control sends no code.
    if (!engine || engine.status === "Ready") return null;
    return { body: CLOUD_REASON_GENERIC_FALLBACK };
  }

  const mapped = REASON_BY_CODE.get(resolved);
  if (mapped) return mapped(ctx);

  if ((isKnownProvisioningReason(resolved) || isSetupStageCode(resolved))
    && (progress?.state === "failed" || isSetupFailure(engine?.status, engine?.lastOperation))) {
    return setupFailureCopy(resolved, false);
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
    if (!isCloudSignedCopyEnabled()) return CLOUD_ACTION_FALLBACK;
    return kind === "delete" ? CLOUD_ACTION_PERMISSION_DELETE : CLOUD_ACTION_PERMISSION;
  }
  if (code === "instance.idempotency-conflict") return CLOUD_ACTION_IDEMPOTENCY_CONFLICT;
  if (code === "instance.slug-conflict") return CLOUD_ACTION_SLUG_CONFLICT;
  if (code === "instance.version-conflict") return CLOUD_ACTION_VERSION_CONFLICT;
  if (code === "instance.catalog-selection-unavailable") return CLOUD_ACTION_CATALOG_UNAVAILABLE;
  if (code === "rate-limit.exceeded") return CLOUD_ACTION_RATE_LIMIT;
  if (LIMIT_CODES.has(code)) return cloudLimitMessage();
  if (code === "unauthorized" || code === "sessions_required" || code === "reauthentication_required") {
    return CLOUD_ACTION_SIGN_IN_AGAIN;
  }
  if (kind === "delete") return CLOUD_DELETE_START_FALLBACK;
  return CLOUD_ACTION_FALLBACK;
}
