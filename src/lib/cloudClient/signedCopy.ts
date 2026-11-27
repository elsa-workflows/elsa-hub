/**
 * Signed Cloud copy for #237. Every customer-facing string in this module is
 * Launch-signed (16:01 CET, 27 Nov 2026, Europe/Amsterdam) unless a comment
 * cites an earlier signature. Straight apostrophes (U+0027) and straight
 * quotes (U+0022) only. Do not add the rejected Failed chip or body for a non-setup failure.
 *
 * Deleted-engine strings, delete toasts, Previous deletions grouping, the
 * code-to-copy mapping, and activity-log copy are always on (Lead exception,
 * 27 Nov 2026). Status and health labels, Launch A/B/E, parked-change lines,
 * and the #948 limit line stay behind `VITE_CLOUD_SIGNED_COPY`.
 */

export const CLOUD_ENGINE_DELETED_TOAST_UNNAMED = "Engine deleted.";
export function cloudEngineDeletedToast(name?: string | null): string {
  const trimmed = name?.trim() ?? "";
  return trimmed ? `Engine "${trimmed}" deleted.` : CLOUD_ENGINE_DELETED_TOAST_UNNAMED;
}

export function cloudEngineDeletingToast(name: string): string {
  return `Deleting "${name}".`;
}

export const CLOUD_DELETED_BANNER_HEADING = "This engine was deleted";
export const CLOUD_DELETED_BANNER_BODY_NO_DATE = "This engine was deleted.";
export function cloudDeletedBannerBody(name: string, date: string): string {
  return `"${name}" was deleted on ${date}.`;
}
export const CLOUD_DELETED_BANNER_SECOND_LINE =
  "Studio, logs and changes aren't available for a deleted engine.";
export function cloudReferenceLine(operationId: string): string {
  return `Reference: ${operationId}.`;
}

export const CLOUD_STATUS_NOT_AVAILABLE = "Not available";
export const CLOUD_STATUS_SETUP_STOPPED = "Setup stopped";
export const CLOUD_STATUS_SETTING_UP = "Setting up";
export const CLOUD_STATUS_NOT_FULLY_HEALTHY = "Not fully healthy";
export const CLOUD_STATUS_STOPPING = "Stopping";
export const CLOUD_STATUS_STOPPED = "Stopped";
export const CLOUD_STATUS_UNAVAILABLE = "Status unavailable";
export const CLOUD_HEALTH_NOT_RESPONDING = "Not responding";
export const CLOUD_HEALTH_HEALTHY = "Healthy";

export const CLOUD_REASON_UNAVAILABLE_BODY =
  "This engine isn't available, so Studio can't be opened.";
export const CLOUD_REASON_RESTART_NEXT =
  "Restart this engine, or email hello@valence.works.";
export const CLOUD_REASON_NEITHER_NEXT = "For help, email hello@valence.works.";
export const CLOUD_REASON_GENERIC_FALLBACK =
  "This engine isn't available. For help, email hello@valence.works.";
export const CLOUD_REASON_STATUS_CANT_BE_LOADED =
  "This engine's status can't be loaded. Refresh this page to check again.";
export const CLOUD_REASON_DELETING_BODY =
  "This engine is being deleted. Studio and changes aren't available.";
export const CLOUD_REASON_PARKED_DELETE_WITH_REF =
  "Deletion of this engine didn't finish on its own. Email hello@valence.works with reference {operationId}.";
export const CLOUD_REASON_PARKED_DELETE_WITH_NAME =
  "Deletion of this engine didn't finish on its own. Email hello@valence.works with this engine's name.";
export const CLOUD_REASON_HELD_DELETE_WITH_REF =
  "Deletion of this engine is on hold. Email hello@valence.works with reference {operationId}.";
export const CLOUD_REASON_HELD_DELETE_WITH_NAME =
  "Deletion of this engine is on hold. Email hello@valence.works with this engine's name.";
export const CLOUD_REASON_IN_PROGRESS_CHANGE =
  "A change to this engine is in progress, so Studio isn't available.";
export const CLOUD_REASON_PARKED_CHANGE_WITH_REF =
  "The last change to this engine didn't finish on its own. Email hello@valence.works with reference {operationId}.";
export const CLOUD_REASON_PARKED_CHANGE_WITH_NAME =
  "The last change to this engine didn't finish on its own. Email hello@valence.works with this engine's name.";
export const CLOUD_REASON_STATUS_CANT_BE_DETERMINED =
  "This engine's status can't be determined. Refresh this page to check again, or email hello@valence.works.";
export const CLOUD_REASON_HANDOFF_UNAVAILABLE =
  "Studio can't be opened from the Hub for this engine. For help, email hello@valence.works.";
export const CLOUD_REASON_IDENTITY_UNAVAILABLE =
  "Studio sign-in isn't available for this engine. For help, email hello@valence.works.";
export const CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT =
  "Another change to this engine is in progress, so deleting isn't available.";
export const CLOUD_REASON_NO_ACTIVE_PLAN =
  "Your Elsa Cloud plan isn't active. For help, email hello@valence.works.";
export const CLOUD_CHIP_NO_ACTIVE_PLAN = "No active plan";

/** Signed #948 v2 Dedicated `instance_limit_reached` line (Launch 7026639754, table 7026623594). */
export const CLOUD_LIMIT_MESSAGE_SIGNED =
  "You've reached the number of engines your plan includes. Remove an engine, or email hello@valence.works.";

export const CLOUD_ACTION_CHANGE_IN_PROGRESS =
  "Another change to this engine is in progress, so this change isn't available.";
export const CLOUD_ACTION_DELETE_CONFIRMATION_INVALID =
  "This delete confirmation is no longer valid. Choose Delete engine to start again.";
export const CLOUD_ACTION_CHANGED_SINCE_READ =
  "This engine changed since this page loaded. Refresh this page to see its current state.";
export const CLOUD_ACTION_PERMISSION =
  "Your account doesn't have permission for this change. For help, email hello@valence.works.";
export const CLOUD_ACTION_PERMISSION_DELETE =
  "Your account doesn't have permission to delete engines. For help, email hello@valence.works.";
export const CLOUD_ACTION_IDEMPOTENCY_CONFLICT =
  "This change was already requested. Refresh this page to see this engine's current state.";
export const CLOUD_ACTION_SLUG_CONFLICT =
  "Another engine already uses this name. Choose a different name.";
export const CLOUD_ACTION_VERSION_CONFLICT =
  "This release can't be applied to this engine. Choose another release, or email hello@valence.works.";
export const CLOUD_ACTION_CATALOG_UNAVAILABLE =
  "This release isn't available. Choose another release, or email hello@valence.works.";
export const CLOUD_ACTION_RATE_LIMIT =
  "Too many requests were made. Try again, or email hello@valence.works.";
export const CLOUD_ACTION_SIGN_IN_AGAIN = "Sign in again to continue.";
export const CLOUD_ACTION_FALLBACK =
  "That change didn't go through. Refresh this page to see this engine's current state, or email hello@valence.works.";
export const CLOUD_DELETE_START_FALLBACK =
  "Deleting this engine didn't start. Email hello@valence.works with this engine's name.";

export const CLOUD_ACTIVITY_CHANGE_REQUESTED = "Change requested";
export const CLOUD_ACTIVITY_FALLBACK = "Engine activity";
export const CLOUD_ACTIVITY_CHECKING_DEPLOYMENT = "Checking deployment status";
export const CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED = "Deployment result not confirmed.";

export function previousDeletionsHeading(count: number): string {
  return `Previous deletions (${count})`;
}

export function parkedDeleteLine(operationId?: string | null): string {
  return operationId
    ? CLOUD_REASON_PARKED_DELETE_WITH_REF.replace("{operationId}", operationId)
    : CLOUD_REASON_PARKED_DELETE_WITH_NAME;
}

export function heldDeleteLine(operationId?: string | null): string {
  return operationId
    ? CLOUD_REASON_HELD_DELETE_WITH_REF.replace("{operationId}", operationId)
    : CLOUD_REASON_HELD_DELETE_WITH_NAME;
}

export function parkedChangeLine(operationId?: string | null): string {
  return operationId
    ? CLOUD_REASON_PARKED_CHANGE_WITH_REF.replace("{operationId}", operationId)
    : CLOUD_REASON_PARKED_CHANGE_WITH_NAME;
}
