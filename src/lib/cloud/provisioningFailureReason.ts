import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";

/**
 * Honest provisioning failure copy for elsa-control#1011.
 *
 * Signed by Elsa Control Launch in elsa-control#1011 comment 7193474184
 * (table 7191501139 + addendum 7191505493). Copy is verbatim with straight
 * apostrophes (U+0027) only. Lines carry no values, stage keys, resource IDs,
 * exit codes or provider text.
 *
 * Delete rows, the Delete button and crash-loop Delete-first ordering
 * are signed but gated on QA's #1012 proof, so they are intentionally absent.
 */
export const ENGINE_SETUP_STOPPED_TITLE = "Engine setup stopped";

export const PROVISIONING_REASON_CODES = [
  "provisioning.timeout.foundation",
  "provisioning.timeout.workload",
  "provisioning.timeout.health",
  "provisioning.health.crash-loop",
] as const;

export type ProvisioningReasonCode = (typeof PROVISIONING_REASON_CODES)[number];

export const provisioningFailureBodyLines: Record<ProvisioningReasonCode, string> = {
  "provisioning.timeout.foundation": "Setup ran out of time while preparing your engine's infrastructure.",
  "provisioning.timeout.workload": "Setup ran out of time while starting your engine.",
  "provisioning.timeout.health": "Setup ran out of time while checking that your engine is healthy.",
  "provisioning.health.crash-loop": "Your engine kept stopping during startup, so it never became healthy.",
};

export const PROVISIONING_FAILURE_FALLBACK_LINE = "Setup stopped before your engine was ready.";

export const PROVISIONING_NEXT_STEP_RETRY_ONLY = "Retry setup, or email hello@valence.works.";
export const PROVISIONING_NEXT_STEP_NEITHER = "For help, email hello@valence.works.";
export const RETRY_SETUP_BUTTON_LABEL = "Retry setup";

/** Operation states that mean work is still in flight (including automatic retries). */
const IN_FLIGHT_OPERATION_STATES = new Set([
  "Accepted",
  "WaitingForPriorOperation",
  "Queued",
  "EntitlementHeld",
  "Running",
  "RecoveryRequired",
]);

function isKnownReasonCode(code: string): code is ProvisioningReasonCode {
  return (PROVISIONING_REASON_CODES as readonly string[]).includes(code);
}

/**
 * Reads the reason code from progress first, then the overview's last and
 * active operations. Every key is optional.
 */
export function resolveProvisioningReasonCode(
  progress?: Pick<CloudProvisioningProgress, "reasonCode"> | null,
  engine?: Pick<CloudEngineOverview, "lastOperation" | "activeOperation"> | null,
): string | null {
  return progress?.reasonCode
    ?? engine?.lastOperation?.reasonCode
    ?? engine?.activeOperation?.progress?.reasonCode
    ?? null;
}

export type ProvisioningFailureCopy = {
  title: typeof ENGINE_SETUP_STOPPED_TITLE;
  body: string;
  nextStep: string;
  showRetry: boolean;
};

/**
 * Returns the signed failure table for every terminal failed snapshot. A
 * failed snapshot without a reason code, or with an unknown one, gets the
 * fallback line. Stale (auto-resuming) snapshots and in-flight or retrying
 * operations return null so the existing guidance renders unchanged.
 *
 * Retry: Control has no explicit retry action yet, so the Retry-only row is
 * not mapped to restart or applyRelease. It shows only when a caller passes
 * retryAllowed, which no page does until Control ships that action.
 */
export function provisioningFailureCopy(
  progress: CloudProvisioningProgress | null | undefined,
  engine: CloudEngineOverview | null | undefined,
  options: { retryAllowed?: boolean } = {},
): ProvisioningFailureCopy | null {
  if (!progress || progress.state !== "failed") return null;
  if (engine?.activeOperation && IN_FLIGHT_OPERATION_STATES.has(engine.activeOperation.state)) return null;
  const code = resolveProvisioningReasonCode(progress, engine);
  const body = code && isKnownReasonCode(code)
    ? provisioningFailureBodyLines[code]
    : PROVISIONING_FAILURE_FALLBACK_LINE;
  // Until #1012, only the Retry-only and Neither rows ship. Delete-only and
  // Retry+Delete states never offer Delete; Delete-only shows Neither.
  const showRetry = Boolean(options.retryAllowed);
  return {
    title: ENGINE_SETUP_STOPPED_TITLE,
    body,
    nextStep: showRetry ? PROVISIONING_NEXT_STEP_RETRY_ONLY : PROVISIONING_NEXT_STEP_NEITHER,
    showRetry,
  };
}
