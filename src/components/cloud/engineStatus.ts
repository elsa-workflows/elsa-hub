import { isSetupFailure } from "@/lib/cloud/enginePresentation";
import { isCloudSignedCopyEnabled } from "@/lib/cloudClient/signedCopyFlag";
import {
  CLOUD_STATUS_NOT_FULLY_HEALTHY,
  CLOUD_STATUS_SETTING_UP,
  CLOUD_STATUS_SETUP_STOPPED,
  CLOUD_STATUS_STOPPED,
  CLOUD_STATUS_STOPPING,
  CLOUD_STATUS_UNAVAILABLE,
} from "@/lib/cloudClient/signedCopy";

export const NEEDS_ATTENTION_LABEL = "Needs attention";

export function isRecoveryRequired(status?: string | null, operationState?: string | null): boolean {
  return status === "RecoveryRequired" || operationState === "RecoveryRequired";
}

type LastOperationStamp = { action?: string | null } | null | undefined;

export function cloudEngineStatusLabel(
  status: string,
  operationState?: string | null,
  lastOperation?: LastOperationStamp,
): string {
  if (isRecoveryRequired(status, operationState)) return NEEDS_ATTENTION_LABEL;
  if (!isCloudSignedCopyEnabled()) return status;
  if (status === "Ready") return "Ready";
  if (status === "Pending" || status === "Provisioning") return CLOUD_STATUS_SETTING_UP;
  if (status === "Updating") return "Updating";
  if (status === "Degraded") return CLOUD_STATUS_NOT_FULLY_HEALTHY;
  if (status === "Stopping") return CLOUD_STATUS_STOPPING;
  if (status === "Stopped") return CLOUD_STATUS_STOPPED;
  if (status === "Failed") {
    return isSetupFailure(status, lastOperation) ? CLOUD_STATUS_SETUP_STOPPED : NEEDS_ATTENTION_LABEL;
  }
  if (status === "Deleting") return "Deleting";
  if (status === "Deleted") return "Deleted";
  if (status === "Unknown" || !status) return CLOUD_STATUS_UNAVAILABLE;
  return CLOUD_STATUS_UNAVAILABLE;
}

export function cloudEngineStatusVariant(status: string, operationState?: string | null) {
  if (isRecoveryRequired(status, operationState)) return "warning" as const;
  if (status === "Ready") return "default" as const;
  if (status === "Failed" || status === "Degraded") return "destructive" as const;
  if (status === "Provisioning" || status === "Updating") return "warning" as const;
  if (isCloudSignedCopyEnabled() && (status === "Pending" || status === "Stopping" || status === "Deleting")) {
    return "warning" as const;
  }
  return "secondary" as const;
}

export function shouldPollCloudEngine(status?: string | null, operationState?: string | null): boolean {
  return status === "Provisioning" ||
    status === "Updating" ||
    status === "Deleting" ||
    isRecoveryRequired(status, operationState);
}

