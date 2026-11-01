import { provisioningStageLabels } from "@/lib/cloud/provisioningLabels";
import type { ManagedProvisioningProgress, ManagedProvisioningStageCode } from "@/lib/cloud/provisioningProgress";

const stageLabels = provisioningStageLabels;

export const STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE =
  "Detailed provisioning progress is temporarily unavailable. The engine status above remains current.";
export const STATE_GUIDANCE_CANCELLED =
  "Provisioning was cancelled before the engine was ready. Email hello@valence.works if you need help restarting.";
export const STATE_GUIDANCE_FAILED_PREFIX = "Provisioning failed at ";
export const STATE_GUIDANCE_FAILED_SUFFIX =
  ". Review the safe guidance below or email hello@valence.works.";
export const STATE_GUIDANCE_NEEDS_ATTENTION_PREFIX = "Provisioning needs attention";
export const STATE_GUIDANCE_NEEDS_ATTENTION_SUFFIX =
  ". Check again or email hello@valence.works if it remains here.";

export function stateGuidance(progress: ManagedProvisioningProgress, temporarilyUnavailable: boolean) {
  if (temporarilyUnavailable || progress.state === "unavailable" || progress.diagnosticCode === "provisioning.history-unavailable") {
    return STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE;
  }
  if (progress.diagnosticCode === "provisioning.cancelled") {
    return STATE_GUIDANCE_CANCELLED;
  }
  if (progress.state === "failed" || progress.diagnosticCode === "provisioning.failed") {
    const failedStage = progress.currentStage
      ? stageLabels[progress.currentStage as ManagedProvisioningStageCode] ?? "the current stage"
      : "the current stage";
    return `Provisioning failed at ${failedStage}. Review the safe guidance below or email hello@valence.works.`;
  }
  if (progress.state === "stale" || progress.diagnosticCode === "provisioning.requires-attention") {
    const pausedAt = progress.currentStage
      ? `: paused at ${stageLabels[progress.currentStage as ManagedProvisioningStageCode] ?? progress.currentStage}`
      : "";
    return `Provisioning needs attention${pausedAt}. Check again or email hello@valence.works if it remains here.`;
  }
  return null;
}
