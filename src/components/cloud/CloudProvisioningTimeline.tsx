import { CLOUD_PROVISIONING_HEADING, CLOUD_UPDATING_RETRY } from "@/lib/cloudClient";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloudClient";
import {
  isParkedCustomerDelete,
  isParkedEngine,
  parkedDeleteGuidance,
  parkedEngineGuidance,
} from "@/lib/cloud/parkedGuidance";
import { mapControlPhaseToStage, stageStatusLabel } from "@/lib/cloud/provisioningPhases";
import {
  provisioningActivityLabels,
  provisioningStageDescriptions,
  provisioningStageLabels,
} from "@/lib/cloud/provisioningLabels";
import {
  isUnmappedProvisioningSnapshot,
  MANAGED_PROVISIONING_STAGE_CODES,
  presentProvisioningAttemptClock,
  UNKNOWN_ATTEMPT_CLOCK_LABEL,
  type ManagedProvisioningActivityMessageCode,
  type ManagedProvisioningProgress,
  type ManagedProvisioningStageCode,
} from "@/lib/cloud/provisioningProgress";
import { DELETING_THIS_ENGINE_HEADING } from "@/lib/cloud/managedEngineDeletionHistory";
import { stateGuidance } from "@/lib/cloud/stateGuidance";
import { NEEDS_ATTENTION_LABEL, isRecoveryRequired } from "./engineStatus";
import { Button } from "@/components/ui/button";

export const WAITING_FOR_PROGRESS_TITLE = "Waiting for progress";

function isActiveDelete(engine?: CloudEngineOverview): boolean {
  return engine?.activeOperation?.action === "Delete" || engine?.status === "Deleting";
}

function isEntitlementHeldDelete(operation?: CloudEngineOverview["activeOperation"]): boolean {
  return operation?.action === "Delete" && operation.state === "EntitlementHeld";
}

function toManagedProgress(progress: CloudProvisioningProgress): ManagedProvisioningProgress {
  return {
    state: progress.state,
    currentStage: progress.currentStage,
    startedAt: progress.startedAt,
    lastUpdatedAt: progress.lastUpdatedAt,
    completedAt: progress.completedAt,
    diagnosticCode: progress.diagnosticCode,
    attemptNumber: progress.attemptNumber,
    attemptStartedAt: progress.attemptStartedAt,
    stages: progress.stages,
    activity: progress.activity ?? [],
  };
}

function currentStageCode(progress: CloudProvisioningProgress): ManagedProvisioningStageCode | null {
  const mapped = mapControlPhaseToStage(progress.phase, progress.attemptedStep);
  if (mapped) return mapped;
  if (progress.currentStage && MANAGED_PROVISIONING_STAGE_CODES.includes(
    progress.currentStage as ManagedProvisioningStageCode,
  )) {
    return progress.currentStage as ManagedProvisioningStageCode;
  }
  return null;
}

export function CloudProvisioningTimeline({
  progress,
  engine,
  onRefresh,
}: {
  progress?: CloudProvisioningProgress;
  engine?: CloudEngineOverview;
  onRefresh?: () => void;
}) {
  const parkedDelete = isParkedCustomerDelete(engine?.activeOperation)
    || isEntitlementHeldDelete(engine?.activeOperation);
  const parked = engine
    ? isParkedEngine(engine.status, engine.activeOperation) || parkedDelete
    : false;
  const activeDelete = isActiveDelete(engine);
  const hideProvisioning = parkedDelete || activeDelete;
  if (!progress) {
    const controlReason = engine?.unavailableReason && engine.unavailableReasonCode !== "not-authorized"
      ? engine.unavailableReason
      : null;
    const parkedFallback = parked
      ? (parkedDelete
        ? parkedDeleteGuidance(null, null, engine?.activeOperation?.id)
        : parkedEngineGuidance(null, null, engine?.activeOperation?.id))
      : null;
    const title = parkedDelete
      ? null
      : activeDelete
      ? DELETING_THIS_ENGINE_HEADING
      : parked
      ? NEEDS_ATTENTION_LABEL
      : CLOUD_PROVISIONING_HEADING;
    return (
      <section className="space-y-3">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {(controlReason ?? parkedFallback) && (
          <p className="text-sm">{controlReason ?? parkedFallback}</p>
        )}
        {!parked && !activeDelete && (
          <p className="text-sm text-muted-foreground">{WAITING_FOR_PROGRESS_TITLE}</p>
        )}
      </section>
    );
  }

  const managed = toManagedProgress(progress);
  const unmapped = isUnmappedProvisioningSnapshot(managed);
  const recoveryRequired = isRecoveryRequired(engine?.status, engine?.activeOperation?.state);
  const title = parkedDelete
    ? null
    : activeDelete
    ? DELETING_THIS_ENGINE_HEADING
    : unmapped
    ? (recoveryRequired ? NEEDS_ATTENTION_LABEL : WAITING_FOR_PROGRESS_TITLE)
    : CLOUD_PROVISIONING_HEADING;
  const stageCode = currentStageCode(progress);
  const stageIndex = stageCode ? MANAGED_PROVISIONING_STAGE_CODES.indexOf(stageCode) : -1;
  const clock = presentProvisioningAttemptClock(managed);
  const controlReason = engine?.unavailableReason && engine.unavailableReasonCode !== "not-authorized"
    ? engine.unavailableReason
    : null;
  const parkedFallback = parked
    ? (parkedDelete
      ? parkedDeleteGuidance(null, null, engine?.activeOperation?.id)
      : parkedEngineGuidance(null, null, engine?.activeOperation?.id))
    : null;
  const reasonCopy = controlReason ?? parkedFallback;
  const guidance = hideProvisioning ? null : stateGuidance(managed, progress.state === "unavailable");
  const latestActivity = [...(progress.activity ?? [])].sort((a, b) => a.sequence - b.sequence).at(-1);
  const activityLabel = latestActivity?.messageCode
    ? provisioningActivityLabels[latestActivity.messageCode as ManagedProvisioningActivityMessageCode]
    : null;

  return (
    <section className="space-y-3">
      {(title || (!hideProvisioning && !unmapped && stageIndex >= 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {!hideProvisioning && !unmapped && stageIndex >= 0 && (
            <p className="text-sm text-muted-foreground">
              Step {stageIndex + 1} of {MANAGED_PROVISIONING_STAGE_CODES.length}
            </p>
          )}
        </div>
      )}

      {!hideProvisioning && clock.primary && <p className="text-sm">{clock.primary}</p>}
      {!hideProvisioning && clock.elapsedUnknown && !clock.primary && (
        <p className="text-sm">{UNKNOWN_ATTEMPT_CLOCK_LABEL}</p>
      )}
      {!hideProvisioning && clock.showAttemptLabel && clock.elapsedUnknown && clock.primary && (
        <p className="text-sm">{UNKNOWN_ATTEMPT_CLOCK_LABEL}</p>
      )}
      {!hideProvisioning && clock.firstStarted && (
        <p className="text-sm text-muted-foreground">First started {clock.firstStarted}</p>
      )}
      {!hideProvisioning && activityLabel && clock.elapsed && (
        <p className="text-sm text-muted-foreground">
          {activityLabel} · +{clock.elapsed}
        </p>
      )}

      {guidance && <p className="text-sm">{guidance}</p>}
      {reasonCopy && <p className="text-sm">{reasonCopy}</p>}

      {onRefresh && (
        <Button type="button" variant="outline" className="min-h-11" onClick={onRefresh}>
          {CLOUD_UPDATING_RETRY}
        </Button>
      )}

      {!hideProvisioning && <ol className="space-y-2">
        {MANAGED_PROVISIONING_STAGE_CODES.map((code, index) => {
          const reported = progress.stages.find((stage) => stage.code === code);
          const reached = !unmapped && stageIndex >= 0 && index < stageIndex;
          const current = !unmapped && stageIndex === index;
          const status = unmapped
            ? "unknown"
            : reported?.status ?? (reached ? "completed" : current ? "current" : "pending");
          const description = provisioningStageDescriptions[code];
          return (
            <li
              key={code}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-2">
                  <span>{provisioningStageLabels[code]}</span>
                  {current && !unmapped && (
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
                  )}
                </p>
                <p className="sr-only">{description}</p>
                <p className="text-sm text-muted-foreground" aria-hidden="true">{description}</p>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {stageStatusLabel(status)}
              </span>
            </li>
          );
        })}
      </ol>}
    </section>
  );
}
