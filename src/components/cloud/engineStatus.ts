export const NEEDS_ATTENTION_LABEL = "Needs attention";

export function isRecoveryRequired(status?: string | null, operationState?: string | null): boolean {
  return status === "RecoveryRequired" || operationState === "RecoveryRequired";
}

export function cloudEngineStatusLabel(status: string, operationState?: string | null): string {
  if (isRecoveryRequired(status, operationState)) return NEEDS_ATTENTION_LABEL;
  return status;
}

export function cloudEngineStatusVariant(status: string, operationState?: string | null) {
  if (isRecoveryRequired(status, operationState)) return "warning" as const;
  if (status === "Ready") return "default" as const;
  if (status === "Failed" || status === "Degraded") return "destructive" as const;
  if (status === "Provisioning" || status === "Updating") return "warning" as const;
  return "secondary" as const;
}

export function shouldPollCloudEngine(status?: string | null, operationState?: string | null): boolean {
  return status === "Provisioning" ||
    status === "Updating" ||
    status === "Deleting" ||
    isRecoveryRequired(status, operationState);
}
