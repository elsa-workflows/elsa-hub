export function cloudEngineStatusVariant(status: string) {
  if (status === "Ready") return "default" as const;
  if (status === "Failed" || status === "Degraded") return "destructive" as const;
  if (status === "Provisioning" || status === "Updating") return "warning" as const;
  return "secondary" as const;
}
