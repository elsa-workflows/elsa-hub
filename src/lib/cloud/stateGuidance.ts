import { provisioningStageLabels } from "@/lib/cloud/provisioningLabels";
import type { ManagedProvisioningProgress, ManagedProvisioningStageCode } from "@/lib/cloud/provisioningProgress";

export const STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE =
  "Detailed provisioning progress can't be loaded. Refresh this page to check again.";
export const STATE_GUIDANCE_CANCELLED =
  "Provisioning was cancelled before the engine was ready. Email hello@valence.works if you need help restarting.";
export const STATE_GUIDANCE_FAILED_BEFORE_READY =
  "Provisioning stopped before the engine was ready. Email hello@valence.works with this engine's name and we'll help during business hours.";
export const STATE_GUIDANCE_NEEDS_ATTENTION_PREFIX = "Provisioning needs attention";
export const STATE_GUIDANCE_NEEDS_ATTENTION_SUFFIX =
  ". Check again or email hello@valence.works if it remains here.";

function controlCurrentStageLabel(currentStage: string | null | undefined): string | null {
  if (!currentStage) return null;
  if (!Object.prototype.hasOwnProperty.call(provisioningStageLabels, currentStage)) return null;
  return provisioningStageLabels[currentStage as ManagedProvisioningStageCode];
}

function isFailedProgressState(state: string): boolean {
  return state === "failed" || state === "Failed";
}

function failedStateGuidance(currentStage: string | null | undefined): string {
  const stage = controlCurrentStageLabel(currentStage);
  if (!stage) return STATE_GUIDANCE_FAILED_BEFORE_READY;
  return `Provisioning stopped at ${stage}. Email hello@valence.works with this engine's name and we'll help during business hours.`;
}

export function stateGuidance(progress: ManagedProvisioningProgress, temporarilyUnavailable: boolean) {
  if (temporarilyUnavailable || progress.state === "unavailable" || progress.diagnosticCode === "provisioning.history-unavailable") {
    return STATE_GUIDANCE_TEMPORARILY_UNAVAILABLE;
  }
  if (progress.diagnosticCode === "provisioning.cancelled") {
    return STATE_GUIDANCE_CANCELLED;
  }
  if (isFailedProgressState(progress.state)) {
    return failedStateGuidance(progress.currentStage);
  }
  if (progress.state === "stale" || progress.diagnosticCode === "provisioning.requires-attention") {
    const stage = controlCurrentStageLabel(progress.currentStage);
    const pausedAt = stage ? `: paused at ${stage}` : "";
    return `Provisioning needs attention${pausedAt}. Check again or email hello@valence.works if it remains here.`;
  }
  return null;
}
