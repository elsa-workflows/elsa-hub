export const MANAGED_PROVISIONING_STAGE_CODES = [
  "request-accepted",
  "hosting-foundation",
  "configuration",
  "runtime-deployment",
  "health-verification",
  "traffic-routing",
  "ready",
] as const;

export type ManagedProvisioningStageCode = (typeof MANAGED_PROVISIONING_STAGE_CODES)[number];

export const MANAGED_PROVISIONING_ACTIVITY_MESSAGE_CODES = [
  "request.accepted",
  "foundation.preparing",
  "foundation.ready",
  "configuration.registry-ready",
  "configuration.secrets-ready",
  "configuration.database-ready",
  "runtime.deploying",
  "runtime.deployed",
  "health.verifying",
  "health.verified",
  "traffic.routing",
  "traffic.routed",
  "engine.ready",
  "provisioning.requires-attention",
  "provisioning.failed",
  "provisioning.cancelled",
] as const;

export type ManagedProvisioningActivityMessageCode =
  (typeof MANAGED_PROVISIONING_ACTIVITY_MESSAGE_CODES)[number];

export type ManagedProvisioningStage = {
  code: ManagedProvisioningStageCode | string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type ManagedProvisioningActivity = {
  sequence: number;
  messageCode?: string | null;
};

export type ManagedProvisioningProgress = {
  state: string;
  currentStage: ManagedProvisioningStageCode | string | null;
  startedAt: string | null;
  lastUpdatedAt: string | null;
  completedAt: string | null;
  diagnosticCode: string | null;
  attemptNumber?: number | null;
  attemptStartedAt?: string | null;
  stages: ManagedProvisioningStage[];
  activity: ManagedProvisioningActivity[];
};

export const UNKNOWN_ATTEMPT_CLOCK_LABEL = "Attempt clock unavailable";

export type ProvisioningAttemptClock = {
  attemptNumber: number | null;
  showAttemptLabel: boolean;
  elapsed: string | null;
  elapsedUnknown: boolean;
  firstStarted: string | null;
  primary: string | null;
};

function elapsedDurationLabel(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes < 60 ? `${minutes}m ${remainder}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function timestampMillis(value: string | null | undefined) {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

/**
 * Current-attempt elapsed. Missing attemptStartedAt is unknown for attempt 2+.
 * Never invented from lastUpdatedAt, stage timestamps, or activity.
 */
export function presentProvisioningAttemptClock(
  progress: ManagedProvisioningProgress,
  now = Date.now(),
): ProvisioningAttemptClock {
  const attemptNumber = progress.attemptNumber ?? null;
  const showAttemptLabel = attemptNumber != null && attemptNumber > 1;
  const attemptClock = timestampMillis(progress.attemptStartedAt);
  const firstStart = timestampMillis(progress.startedAt);
  const end = progress.completedAt ? Date.parse(progress.completedAt) : now;

  let elapsedSource = Number.NaN;
  if (Number.isFinite(attemptClock)) {
    elapsedSource = attemptClock;
  } else if (!showAttemptLabel && Number.isFinite(firstStart)) {
    elapsedSource = firstStart;
  }

  const elapsed = Number.isFinite(elapsedSource) && Number.isFinite(end)
    ? elapsedDurationLabel(Math.max(0, end - elapsedSource))
    : null;
  const elapsedUnknown = !elapsed && (showAttemptLabel || (attemptNumber != null && progress.attemptStartedAt === null));
  const firstStarted = showAttemptLabel && Number.isFinite(firstStart)
    ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(firstStart)
    : null;

  let primary: string | null = null;
  if (showAttemptLabel && elapsed) primary = `Attempt ${attemptNumber} · elapsed ${elapsed}`;
  else if (showAttemptLabel) primary = `Attempt ${attemptNumber}`;
  else if (elapsed) primary = `Elapsed ${elapsed}`;

  return {
    attemptNumber,
    showAttemptLabel,
    elapsed,
    elapsedUnknown,
    firstStarted,
    primary,
  };
}

/**
 * Control #698: an unmapped provider step marks every stage unknown and
 * sends currentStage: null. That snapshot is authoritative, not step 0.
 */
export function isUnmappedProvisioningSnapshot(progress: ManagedProvisioningProgress) {
  if (progress.state === "ready") return false;
  const allUnknown = progress.stages.length > 0 && progress.stages.every((stage) => stage.status === "unknown");
  return progress.currentStage == null || allUnknown;
}

export function managedProvisioningStageIndex(progress: ManagedProvisioningProgress): number | null {
  if (progress.state === "ready") return MANAGED_PROVISIONING_STAGE_CODES.length - 1;
  if (isUnmappedProvisioningSnapshot(progress)) return null;
  if (progress.currentStage) {
    return MANAGED_PROVISIONING_STAGE_CODES.indexOf(
      progress.currentStage as ManagedProvisioningStageCode,
    );
  }
  return 0;
}

function snapshotTimestampAdvanced(previous: ManagedProvisioningProgress, next: ManagedProvisioningProgress) {
  const previousUpdated = previous.lastUpdatedAt ? Date.parse(previous.lastUpdatedAt) : Number.NaN;
  const nextUpdated = next.lastUpdatedAt ? Date.parse(next.lastUpdatedAt) : Number.NaN;
  return Number.isFinite(previousUpdated) && Number.isFinite(nextUpdated) && nextUpdated > previousUpdated;
}

function snapshotIsNotOlder(previous: ManagedProvisioningProgress, next: ManagedProvisioningProgress) {
  const previousUpdated = previous.lastUpdatedAt ? Date.parse(previous.lastUpdatedAt) : Number.NaN;
  const nextUpdated = next.lastUpdatedAt ? Date.parse(next.lastUpdatedAt) : Number.NaN;
  if (Number.isFinite(previousUpdated) && Number.isFinite(nextUpdated) && nextUpdated < previousUpdated) return false;

  const previousSequence = previous.activity.at(-1)?.sequence ?? -1;
  const nextSequence = next.activity.at(-1)?.sequence ?? -1;
  const updateAdvanced = snapshotTimestampAdvanced(previous, next);
  // Control appends a synthetic blocked row only while the provider stage is
  // known. Dropping that row lowers the last sequence without making a newer
  // lastUpdatedAt snapshot older.
  if (updateAdvanced && isUnmappedProvisioningSnapshot(next)) return true;
  if (previous.state === "stale" && next.state !== "stale") {
    return updateAdvanced || nextSequence > previousSequence;
  }
  return nextSequence >= previousSequence;
}

export function shouldAdoptManagedProvisioningProgress(
  previous: ManagedProvisioningProgress | null,
  next: ManagedProvisioningProgress,
) {
  if (!previous || previous.state === "unavailable") return next.state !== "unavailable";
  if (next.state === "unavailable") return false;

  const previousStart = previous.startedAt ? Date.parse(previous.startedAt) : Number.NaN;
  const nextStart = next.startedAt ? Date.parse(next.startedAt) : Number.NaN;
  if (Number.isFinite(previousStart) && Number.isFinite(nextStart) && previousStart !== nextStart) {
    return nextStart > previousStart;
  }

  const previousAttempt = previous.attemptNumber;
  const nextAttempt = next.attemptNumber;
  if (previousAttempt != null && nextAttempt != null) {
    if (nextAttempt > previousAttempt) return true;
    if (nextAttempt < previousAttempt) return false;
  }

  if (["ready", "failed"].includes(previous.state) && previous.state !== next.state) return false;
  // Control's all-unknown snapshot is never a regression of a known stage.
  // A strictly newer lastUpdatedAt adopts even if the synthetic blocked row disappeared.
  if (isUnmappedProvisioningSnapshot(next)) return snapshotIsNotOlder(previous, next);

  const previousStage = managedProvisioningStageIndex(previous);
  const nextStage = managedProvisioningStageIndex(next);
  // Leaving unknown, advancing a known stage, and same-stage enrichment all
  // require freshness. A newly present attempt clock is not evidence that the
  // snapshot is newer and cannot rewind or clear a known stage.
  if (previousStage == null) return snapshotIsNotOlder(previous, next);
  if (nextStage != null && nextStage < previousStage) return false;

  return snapshotIsNotOlder(previous, next);
}
