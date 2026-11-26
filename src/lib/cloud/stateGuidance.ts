import type { ManagedProvisioningProgress } from "@/lib/cloud/provisioningProgress";
import {
  PROVISIONING_FAILURE_FALLBACK_LINE,
  PROVISIONING_NEXT_STEP_NEITHER,
} from "@/lib/cloud/provisioningFailureReason";

export const STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE =
  "Detailed provisioning progress can't be loaded. Refresh this page to check again.";
export const STATE_GUIDANCE_CANCELLED =
  "Provisioning was cancelled before the engine was ready. Email hello@valence.works if you need help restarting.";

/**
 * Signed #1011 fallback plus the Neither next-step line. Used when progress
 * is failed but the signed failure table is not shown (for example a Retry
 * in flight on a failed snapshot, or a legacy capitalised "Failed" state).
 * Both sentences are Launch-signed verbatim; they are joined with one space
 * and carry no interpolated values.
 */
export const STATE_GUIDANCE_FAILED_BEFORE_READY =
  `${PROVISIONING_FAILURE_FALLBACK_LINE} ${PROVISIONING_NEXT_STEP_NEITHER}`;

/**
 * Signed #1011 Neither line. Replaces the old duration-implying attention
 * copy. "Provisioning needs attention" is not a signed sentence, so it is
 * not used as a lead-in.
 */
export const STATE_GUIDANCE_NEEDS_ATTENTION = PROVISIONING_NEXT_STEP_NEITHER;

function isFailedProgressState(state: string): boolean {
  return state === "failed" || state === "Failed";
}

export function stateGuidance(progress: ManagedProvisioningProgress, temporarilyUnavailable: boolean) {
  if (temporarilyUnavailable || progress.state === "unavailable" || progress.diagnosticCode === "provisioning.history-unavailable") {
    return STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE;
  }
  if (progress.diagnosticCode === "provisioning.cancelled") {
    return STATE_GUIDANCE_CANCELLED;
  }
  if (isFailedProgressState(progress.state)) {
    return STATE_GUIDANCE_FAILED_BEFORE_READY;
  }
  if (progress.state === "stale" || progress.diagnosticCode === "provisioning.requires-attention") {
    return STATE_GUIDANCE_NEEDS_ATTENTION;
  }
  return null;
}
