// Domain types for the Elsa Runtime Builder.
// Shapes match the Catalog API contract so the static loader can be swapped
// for a real fetch later without touching consumers.

export type LicenseTier = "OSS" | "Professional" | "Enterprise";
export type Stability = "Stable" | "Preview" | "Experimental";

export type CapabilityCategory =
  | "Persistence"
  | "Messaging"
  | "AI"
  | "Observability"
  | "Authentication"
  | "Scheduling"
  | "Integrations"
  | "Storage"
  | "Runtime Extensions";

export interface RuntimeImage {
  id: string;
  displayName: string;
  description: string;
  longDescription?: string;
  versions: string[]; // first entry is the default
  elsaVersion: string;
  capabilities: string[]; // capability ids supported
  recommendedCapabilities?: string[];
  licenseTier: LicenseTier;
  stability: Stability;
  audience: string;
  estimatedSizeMb: number;
  dockerImage: string; // e.g. "elsaworkflows/elsa-pro-server"
  icon?: string; // optional emoji-ish marker
  tags?: string[];
}

export interface FeatureRef {
  id: string; // matches FeatureSchema.featureId
  displayName: string;
  packageId: string;
  packageVersion: string;
}

export interface Capability {
  id: string;
  displayName: string;
  description: string;
  category: CapabilityCategory;
  features: FeatureRef[];
  dependencies?: string[]; // capability ids
  conflicts?: string[]; // capability ids
  recommended?: boolean;
  advanced?: boolean;
  tags?: string[];
}

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
  required?: boolean;
  secret?: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  enumValues?: { value: string; label: string }[];
  advanced?: boolean;
  group?: string;
  envHint?: string; // suggested env var name
  // For nested objects:
  settings?: SettingSchema[];
}

export interface FeatureSchema {
  featureId: string;
  displayName: string;
  capabilityId: string;
  settings: SettingSchema[];
}

export interface CompatibilityRule {
  // when these capabilities are enabled together → emit message
  ifAll?: string[];
  ifAny?: string[];
  // when these capabilities are missing → emit message
  ifMissing?: string[];
  // only apply when image matches one of these ids
  forImages?: string[];
  level: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface Catalog {
  version: string;
  images: RuntimeImage[];
  capabilities: Capability[];
  schemas: FeatureSchema[];
  rules: CompatibilityRule[];
}

export interface BuilderState {
  imageId: string | null;
  imageVersion: string | null;
  capabilityIds: string[];
  // settings keyed by featureId then by setting name
  settings: Record<string, Record<string, unknown>>;
  // optional NuGet version overrides keyed by packageId (advanced mode)
  overrides: Record<string, string>;
  advancedMode: boolean;
  meta?: {
    name?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface ValidationFinding {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  scope?:
    | { kind: "image" }
    | { kind: "capability"; capabilityId: string }
    | { kind: "feature"; featureId: string; settingName?: string };
}

export interface ValidationResult {
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
  passes: ValidationFinding[];
  isValid: boolean;
  readiness: number; // 0-100
}

export interface GeneratedFile {
  path: string;
  language: "json" | "yaml" | "ini" | "markdown" | "text";
  contents: string;
}
