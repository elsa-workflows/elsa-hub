// Tool-call "intent" payloads emitted by the copilot edge function.
// The client validates and applies these after the user clicks Confirm.

export type CopilotIntent =
  | NavigateIntent
  | RbAddPackageIntent
  | RbRemovePackageIntent
  | RbToggleFeatureIntent
  | RbSetFeatureSettingIntent
  | RbSelectInfrastructureIntent
  | RbAutoFillInfrastructureIntent
  | RbValidateIntent
  | RbGenerateBundleIntent;

export interface NavigateIntent {
  kind: "navigate";
  path: string;
  label: string;
  reason: string;
}

export interface RbAddPackageIntent {
  kind: "rb.addPackage";
  packageId: string;
  reason?: string;
}
export interface RbRemovePackageIntent {
  kind: "rb.removePackage";
  packageId: string;
}
export interface RbToggleFeatureIntent {
  kind: "rb.toggleFeature";
  packageId: string;
  featureId: string;
  enabled: boolean;
}
export interface RbSetFeatureSettingIntent {
  kind: "rb.setFeatureSetting";
  packageId: string;
  featureId: string;
  name: string;
  value: unknown;
}
export interface RbSelectInfrastructureIntent {
  kind: "rb.selectInfrastructure";
  kindOf: string;
  providerId: string;
}
export interface RbAutoFillInfrastructureIntent {
  kind: "rb.autoFillInfrastructure";
}
export interface RbValidateIntent {
  kind: "rb.validate";
}
export interface RbGenerateBundleIntent {
  kind: "rb.generateBundle";
}

export function isCopilotIntent(value: unknown): value is CopilotIntent {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { kind?: unknown }).kind === "string",
  );
}
