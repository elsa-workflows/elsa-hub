// Tool-call "intent" payloads emitted by the weaver edge function.
// The client validates and applies these after the user clicks Confirm.

export type WeaverIntent =
  | NavigateIntent
  | DeepWikiIntent
  | RbAddPackageIntent
  | RbRemovePackageIntent
  | RbToggleFeatureIntent
  | RbSetFeatureSettingIntent
  | RbSelectInfrastructureIntent
  | RbSelectImageIntent
  | RbAutoFillInfrastructureIntent
  | RbValidateIntent
  | RbGenerateBundleIntent;

export interface NavigateIntent {
  kind: "navigate";
  path: string;
  label: string;
  reason: string;
}

export interface DeepWikiIntent {
  kind: "deepwiki";
  url: string;
  label: string;
  reason: string;
  repo: "elsa-core" | "elsa-studio" | "elsa-extensions";
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
export interface RbSelectImageIntent {
  kind: "rb.selectImage";
  slug: string;
  tag?: string;
  hostPort?: number;
  reason?: string;
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

export function isWeaverIntent(value: unknown): value is WeaverIntent {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { kind?: unknown }).kind === "string",
  );
}
