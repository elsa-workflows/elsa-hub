// V2 domain model: package-manifest + infrastructure driven.
// The legacy v1 types in `./types.ts` remain for the migration code path only.

export type SettingType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "object";

export interface SettingSchema {
  name: string;
  displayName: string;
  type: SettingType;
  /** Raw JSON Schema type from the catalog API (e.g. "boolean", "integer"). */
  jsonType?: string;
  required?: boolean;
  secret?: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  enumValues?: { value: string; label: string }[];
  advanced?: boolean;
  group?: string;
  envHint?: string;
  settings?: SettingSchema[];
  /** Open-ended UI hints for forward-compatibility (widget, optionsEndpoint, format, multiline, ...). */
  ui?: Record<string, unknown>;
}

export function envVarFromHint(hint: string): string {
  return hint.replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
}

export type Strategy =
  | "compose-sidecar"
  | "external-service"
  | "managed"
  | "none";

export type InfraKind =
  | "database"
  | "message-broker"
  | "cache"
  | "blob-storage"
  | "smtp"
  | "search"
  | "secrets";

export type LicenseTier = "OSS" | "Professional" | "Enterprise";
export type Stability = "Stable" | "Preview" | "Experimental";

export interface PackageSource {
  id: string;
  name: string;
  url: string;
  protocol: "nuget-v3";
  authMode: "none" | "apiKey";
  apiKeySecretName?: string;
  enabled: boolean;
}

export interface InfraRequirement {
  kind: InfraKind;
  capabilities?: string[];
  optional?: boolean;
}

export interface FeatureDependency {
  featureId: string;
  packageId?: string;
  optional?: boolean;
  reason?: string;
}

export interface PackageFeature {
  id: string;
  displayName: string;
  description?: string;
  requires?: { infrastructure?: InfraRequirement[] };
  settings: SettingSchema[];
  dependencies?: FeatureDependency[];
}

export interface PackageManifest {
  id: string;
  displayName: string;
  description?: string;
  version: string;
  versions: string[];
  licenseTier: LicenseTier;
  stability: Stability;
  category: string;
  features: PackageFeature[];
  conflictsWith?: string[];
  tags?: string[];
}

export interface InfrastructureProvider {
  id: string;
  displayName: string;
  kind: InfraKind;
  strategy: Strategy;
  provider: string;
  capabilities: string[];
  outputs: string[];
  settings?: SettingSchema[];
}

export interface SelectedPackage {
  packageId: string;
  version: string;
  selectedFeatures: string[];
  settings: Record<string, Record<string, unknown>>;
  /** True when this package was auto-added by the dependency resolver. */
  autoAdded?: boolean;
  /** Features auto-ticked by the dependency resolver. */
  autoFeatures?: string[];
}

export interface InfrastructureSelection {
  kind: InfraKind;
  providerId: string | null;
  strategy: Strategy;
  settings: Record<string, unknown>;
}

export interface BuilderStateV2 {
  schemaVersion: 2;
  packageSources: PackageSource[];
  selectedPackages: SelectedPackage[];
  infrastructureSelections: InfrastructureSelection[];
  shellProfile?: { id: string; settings?: Record<string, unknown> };
  advancedMode: boolean;
  meta?: {
    name?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface CatalogV2 {
  packages: PackageManifest[];
  infrastructureProviders: InfrastructureProvider[];
}

export interface ResolveFinding {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  scope?: {
    kind: "package" | "feature" | "infrastructure" | "global";
    packageId?: string;
    featureId?: string;
    infraKind?: InfraKind;
  };
}

export interface ResolveResponse {
  compatible: boolean;
  findings: ResolveFinding[];
}

export const DEFAULT_PACKAGE_SOURCES: PackageSource[] = [
  {
    id: "nuget-org",
    name: "nuget.org",
    url: "https://api.nuget.org/v3/index.json",
    protocol: "nuget-v3",
    authMode: "none",
    enabled: true,
  },
  {
    id: "elsa-myget",
    name: "Elsa OSS (myget)",
    url: "https://www.myget.org/F/elsa-3/api/v3/index.json",
    protocol: "nuget-v3",
    authMode: "none",
    enabled: false,
  },
];

export const EMPTY_BUILDER_STATE_V2: BuilderStateV2 = {
  schemaVersion: 2,
  packageSources: DEFAULT_PACKAGE_SOURCES,
  selectedPackages: [],
  infrastructureSelections: [],
  advancedMode: false,
};
