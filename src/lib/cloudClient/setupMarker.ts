import { isCloudBffError, type CloudBffAction, type CloudBffResponse } from "@/lib/cloud";

export const CLOUD_SETUP_MARKER_PREFIX = "elsa.cloud.setup:";

export function cloudSetupMarkerKey(userId: string) {
  return `${CLOUD_SETUP_MARKER_PREFIX}${userId}`;
}

export function hasCloudSetupMarker(userId: string): boolean {
  try {
    return localStorage.getItem(cloudSetupMarkerKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function setCloudSetupMarker(userId: string) {
  try {
    localStorage.setItem(cloudSetupMarkerKey(userId), "1");
  } catch {
    // Private mode / quota: the next visit will show setup again.
  }
}

export function clearCloudSetupMarker(userId: string) {
  try {
    localStorage.removeItem(cloudSetupMarkerKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Drop the Hub-side setup marker when this user is gone (401) or Control
 * no longer has them (404 on account-level actions). Engine 404s stay put.
 */
export function forgetCloudSetupIfUserGone(
  userId: string,
  response: CloudBffResponse,
  action: CloudBffAction,
): boolean {
  if (!isCloudBffError(response)) return false;
  if (response.code === "unauthorized") {
    clearCloudSetupMarker(userId);
    return true;
  }
  if (response.code === "not_found" && action !== "engineOverview" && action !== "listEngines") {
    clearCloudSetupMarker(userId);
    return true;
  }
  return false;
}
