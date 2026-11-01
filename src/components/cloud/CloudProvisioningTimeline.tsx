import { CLOUD_PROVISIONING_HEADING, CLOUD_UPDATING_RETRY } from "@/lib/cloudClient";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloudClient";
import {
  isParkedCustomerDelete,
  isParkedEngine,
  parkedDeleteGuidance,
  parkedEngineGuidance,
} from "@/lib/cloud/parkedGuidance";
import { mapControlPhaseToStage, STATUS_UNAVAILABLE_LABEL } from "@/lib/cloud/provisioningPhases";
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
import { stateGuidance } from "@/lib/cloud/stateGuidance";
import { NEEDS_ATTENTION_LABEL, isRecoveryRequired } from "./engineStatus";
import { Button } from "@/components/ui/button";

export const WAITING_FOR_PROGRESS_TITLE = "Waiting for progress";

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
  const parkedDeleteWithoutProgress = isParkedCustomerDelete(engine?.activeOperation);
  if (!progress) {
    const controlReason = engine?.unavailableReason && engine.unavailableReasonCode !== "not-authorized"
      ? engine.unavailableReason
      : null;
    const parkedFallback = parkedDeleteWithoutProgress
      ? parkedDeleteGuidance(null, null, engine?.activeOperation?.id)
      : null;
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {parkedDeleteWithoutProgress ? NEEDS_ATTENTION_LABEL : CLOUD_PROVISIONING_HEADING}
        </h2>
        {(controlReason ?? parkedFallback) && (
          <p className="text-sm">{controlReason ?? parkedFallback}</p>
        )}
        {!parkedDeleteWithoutProgress && (
          <p className="text-sm text-muted-foreground">{WAITING_FOR_PROGRESS_TITLE}</p>
        )}
      </section>
    );
  }

  const managed = toManagedProgress(progress);
  const unmapped = isUnmappedProvisioningSnapshot(managed);
  const recoveryRequired = isRecoveryRequired(engine?.status, engine?.activeOperation?.state);
  const parkedDelete = isParkedCustomerDelete(engine?.activeOperation);
  const title = parkedDelete
    ? NEEDS_ATTENTION_LABEL
    : unmapped
    ? (recoveryRequired ? NEEDS_ATTENTION_LABEL : WAITING_FOR_PROGRESS_TITLE)
    : CLOUD_PROVISIONING_HEADING;
  const stageCode = currentStageCode(progress);
  const stageIndex = stageCode ? MANAGED_PROVISIONING_STAGE_CODES.indexOf(stageCode) : -1;
  const clock = presentProvisioningAttemptClock(managed);
  const parked = engine
    ? isParkedEngine(engine.status, engine.activeOperation)
    : false;
  const controlReason = engine?.unavailableReason && engine.unavailableReasonCode !== "not-authorized"
    ? engine.unavailableReason
    : null;
  const parkedFallback = parked
    ? (parkedDelete
      ? parkedDeleteGuidance(null, null, engine?.activeOperation?.id)
      : parkedEngineGuidance(null, null, engine?.activeOperation?.id))
    : null;
  const reasonCopy = controlReason ?? parkedFallback;
  const guidance = parkedDelete ? null : stateGuidance(managed, progress.state === "unavailable");
  const latestActivity = [...(progress.activity ?? [])].sort((a, b) => a.sequence - b.sequence).at(-1);
  const activityLabel = latestActivity?.messageCode
    ? provisioningActivityLabels[latestActivity.messageCode as ManagedProvisioningActivityMessageCode]
    : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {!parkedDelete && !unmapped && stageIndex >= 0 && (
          <p className="text-sm text-muted-foreground">
            Step {stageIndex + 1} of {MANAGED_PROVISIONING_STAGE_CODES.length}
          </p>
        )}
      </div>

      {clock.primary && <p className="text-sm">{clock.primary}</p>}
      {clock.elapsedUnknown && !clock.primary && (
        <p className="text-sm">{UNKNOWN_ATTEMPT_CLOCK_LABEL}</p>
      )}
      {clock.showAttemptLabel && clock.elapsedUnknown && clock.primary && (
        <p className="text-sm">{UNKNOWN_ATTEMPT_CLOCK_LABEL}</p>
      )}
      {clock.firstStarted && (
        <p className="text-sm text-muted-foreground">First started {clock.firstStarted}</p>
      )}
      {activityLabel && clock.elapsed && (
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

      {!parkedDelete && <ol className="space-y-2">
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
              <span className="shrink-0 text-sm text-muted-foreground capitalize">
                {status === "unknown" ? STATUS_UNAVAILABLE_LABEL : status}
              </span>
            </li>
          );
        })}
      </ol>}

      {(engine?.activeOperation || progress.phase || progress.attemptedStep) && (
        <details className="text-sm text-muted-foreground">
          <summary className="min-h-11 cursor-pointer">Technical details</summary>
          <dl className="mt-2 space-y-1">
            {engine?.activeOperation?.action && <div>Action: {engine.activeOperation.action}</div>}
            {engine?.activeOperation?.state && <div>State: {engine.activeOperation.state}</div>}
            {engine?.activeOperation?.id && <div>Operation: {engine.activeOperation.id}</div>}
            {progress.phase && <div>Phase: {progress.phase}</div>}
            {progress.attemptedStep && <div>Attempted step: {progress.attemptedStep}</div>}
          </dl>
        </details>
      )}
    </section>
  );
}
