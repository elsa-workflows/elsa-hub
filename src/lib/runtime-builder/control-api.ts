// Client for the live Valence Control builder API.
// Everything goes through the `runtime-builder-catalog` edge function so the
// bundle API key never reaches the browser.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ types */

export interface ImageEnvVar {
  name: string;
  displayName: string;
  description?: string | null;
  required: boolean;
  secret: boolean;
  defaultValue?: string | null;
  group?: string | null;
  advanced: boolean;
}

export interface DeploymentHints {
  supportsDockerCompose: boolean;
  supportsKubernetes: boolean;
  requiresCompanionServer: boolean;
  needsSharedNetwork: boolean;
  companionImageSlug: string | null;
}

export interface CatalogImage {
  slug: string;
  displayName: string;
  description?: string | null;
  image: string;
  availableTags: string[];
  defaultTag: string;
  defaultPort: number;
  hostPort: number;
  containerName: string;
  licenseTier?: string | null;
  stability?: string | null;
  capabilities: string[];
  runtimeKinds: string[];
  envVars: ImageEnvVar[];
  deploymentHints: DeploymentHints;
  docs?: Record<string, unknown> | null;
}

export interface FeatureSetting {
  name: string;
  displayName: string;
  description?: string | null;
  jsonType?: string | null;
  clrType?: string | null;
  required: boolean;
  secret: boolean;
  defaultValue?: unknown;
  category?: string | null;
  environmentVariable?: string | null;
  ui?: { advanced?: boolean; experimental?: boolean } | null;
  extensions?: Record<string, unknown> | null;
}

export interface FeatureInfraRequirement {
  id: string;
  kind: string;
  optional: boolean;
  reason?: string | null;
  capabilities: string[];
  providers: string[];
  configurationKeys?: string[];
}

export interface CatalogFeature {
  featureId: string;
  displayName: string;
  description?: string | null;
  category?: string | null;
  categories: string[];
  runtimeKinds: string[];
  dependencies: { featureId: string; packageId?: string | null; optional?: boolean; reason?: string | null }[];
  conflicts: unknown[];
  infrastructure: FeatureInfraRequirement[];
  advanced: boolean;
  experimental: boolean;
  settings: FeatureSetting[];
}

export interface CatalogSource {
  id: string;
  name?: string | null;
  url?: string | null;
  kind?: string | null;
}

export interface CatalogVersion {
  packageId: string;
  version: string;
  source: CatalogSource;
  runtimeKinds: string[];
  publishedAt?: string | null;
  features: CatalogFeature[];
}

export interface CatalogPackage {
  packageId: string;
  displayName: string;
  source: CatalogSource;
  runtimeKinds: string[];
  latestVersion: string;
  versions: CatalogVersion[];
}

export interface CatalogInfraProvider {
  id: string;
  displayName: string;
  kind: string;
  strategy: string;
  provider: string;
  capabilities: string[];
  outputs: string[];
}

export interface ControlCatalog {
  images: CatalogImage[];
  packages: CatalogPackage[];
  infrastructureProviders: CatalogInfraProvider[];
  degraded?: boolean;
  degradedReason?: string;
}

export interface PlanFinding {
  level: "error" | "warning" | "info";
  code: string;
  message: string;
  scope?: Record<string, unknown> | null;
}

export interface PlanIntentPackage {
  sourceId: string;
  packageId: string;
  version: string;
  selectedFeatures: string[];
  settings: Record<string, unknown>;
}

export interface PlanIntent {
  image: {
    slug: string;
    tag: string;
    hostPort: number;
    envOverrides: Record<string, string>;
  };
  packages: PlanIntentPackage[];
  packageSources: { sourceId: string }[];
  infrastructure: {
    kind: string;
    providerId: string;
    strategy: string;
    settings: Record<string, unknown>;
  }[];
}

export interface PlanResponse {
  resolved?: unknown;
  autoAdded?: {
    packages?: PlanIntentPackage[];
    features?: string[];
    infrastructure?: { kind?: string; providerId?: string; strategy?: string }[];
  };
  findings: PlanFinding[];
}

export interface BundleFile {
  path: string;
  contents: string;
  language?: string;
}

export interface BundleResult {
  files: BundleFile[];
  binary?: { contentType: string; fileName: string; base64: string };
}

/* ----------------------------------------------------------------- client */

async function invoke<T>(action: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("runtime-builder-catalog", {
    body: { action, body },
  });
  if (error) throw new Error(error.message ?? "Builder API proxy error");
  const record = (data ?? {}) as Record<string, unknown>;
  if (typeof record.error === "string") throw new Error(record.error);
  return data as T;
}

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function normalizeFeature(raw: Record<string, unknown>): CatalogFeature | null {
  const featureId = typeof raw.featureId === "string" ? raw.featureId : null;
  if (!featureId) return null;
  const categories = asStrings(raw.categories);
  return {
    featureId,
    displayName:
      typeof raw.displayName === "string" && raw.displayName ? raw.displayName : featureId,
    description: typeof raw.description === "string" ? raw.description : null,
    category: typeof raw.category === "string" ? raw.category : null,
    categories,
    runtimeKinds: asStrings(raw.runtimeKinds),
    dependencies: asArray<CatalogFeature["dependencies"][number]>(raw.dependencies),
    conflicts: asArray(raw.conflicts),
    infrastructure: asArray<FeatureInfraRequirement>(raw.infrastructure),
    advanced: Boolean(raw.advanced) || Boolean((raw.ui as { advanced?: boolean })?.advanced),
    experimental: Boolean(raw.experimental),
    settings: asArray<Record<string, unknown>>(raw.settings).map((s) => ({
      name: String(s.name ?? ""),
      displayName:
        typeof s.displayName === "string" && s.displayName ? s.displayName : String(s.name ?? ""),
      description: typeof s.description === "string" ? s.description : null,
      jsonType: typeof s.jsonType === "string" ? s.jsonType : null,
      clrType: typeof s.clrType === "string" ? s.clrType : null,
      required: Boolean(s.required),
      secret: Boolean(s.secret) || Boolean((s.extensions as { sensitive?: boolean })?.sensitive),
      defaultValue: s.defaultValue,
      category: typeof s.category === "string" ? s.category : null,
      environmentVariable:
        typeof s.environmentVariable === "string" ? s.environmentVariable : null,
      ui: (s.ui as FeatureSetting["ui"]) ?? null,
      extensions: (s.extensions as Record<string, unknown>) ?? null,
    })).filter((s) => s.name),
  };
}

function normalizeCatalog(raw: Record<string, unknown>): ControlCatalog {
  const images = asArray<Record<string, unknown>>(raw.images).map((i) => ({
    slug: String(i.slug ?? ""),
    displayName: typeof i.displayName === "string" ? i.displayName : String(i.slug ?? ""),
    description: typeof i.description === "string" ? i.description : null,
    image: String(i.image ?? ""),
    availableTags: asStrings(i.availableTags),
    defaultTag: typeof i.defaultTag === "string" ? i.defaultTag : "latest",
    defaultPort: Number(i.defaultPort ?? 8080),
    hostPort: Number(i.hostPort ?? 8080),
    containerName: String(i.containerName ?? i.slug ?? "elsa"),
    licenseTier: typeof i.licenseTier === "string" ? i.licenseTier : null,
    stability: typeof i.stability === "string" ? i.stability : null,
    capabilities: asStrings(i.capabilities),
    runtimeKinds: asStrings(i.runtimeKinds),
    envVars: asArray<Record<string, unknown>>(i.envVars).map((e) => ({
      name: String(e.name ?? ""),
      displayName: typeof e.displayName === "string" ? e.displayName : String(e.name ?? ""),
      description: typeof e.description === "string" ? e.description : null,
      required: Boolean(e.required),
      secret: Boolean(e.secret),
      defaultValue: typeof e.defaultValue === "string" ? e.defaultValue : null,
      group: typeof e.group === "string" ? e.group : null,
      advanced: Boolean(e.advanced),
    })).filter((e) => e.name),
    deploymentHints: {
      supportsDockerCompose: true,
      supportsKubernetes: false,
      requiresCompanionServer: false,
      needsSharedNetwork: false,
      companionImageSlug: null,
      ...((i.deploymentHints as Partial<DeploymentHints>) ?? {}),
    },
    docs: (i.docs as Record<string, unknown>) ?? null,
  })).filter((i) => i.slug);

  const packages = asArray<Record<string, unknown>>(raw.packages)
    .map((p) => {
      const packageId = typeof p.packageId === "string" ? p.packageId : null;
      if (!packageId) return null;
      const source = (p.source as CatalogSource) ?? { id: "" };
      const versions: CatalogVersion[] = asArray<Record<string, unknown>>(p.versions).map((v) => ({
        packageId,
        version: String(v.version ?? ""),
        source: (v.source as CatalogSource) ?? source,
        runtimeKinds: asStrings(v.runtimeKinds),
        publishedAt: typeof v.publishedAt === "string" ? v.publishedAt : null,
        features: asArray<Record<string, unknown>>(v.features)
          .map(normalizeFeature)
          .filter((f): f is CatalogFeature => f !== null),
      }));
      return {
        packageId,
        displayName: typeof p.displayName === "string" ? p.displayName : packageId,
        source,
        runtimeKinds: asStrings(p.runtimeKinds),
        latestVersion:
          typeof p.latestVersion === "string"
            ? p.latestVersion
            : versions[0]?.version ?? "",
        versions,
      } satisfies CatalogPackage;
    })
    .filter((p): p is CatalogPackage => p !== null);

  const infrastructureProviders = asArray<Record<string, unknown>>(raw.infrastructureProviders)
    .map((p) => ({
      id: String(p.id ?? ""),
      displayName: typeof p.displayName === "string" ? p.displayName : String(p.id ?? ""),
      kind: String(p.kind ?? "other"),
      strategy: String(p.strategy ?? "compose-sidecar"),
      provider: String(p.provider ?? p.id ?? ""),
      capabilities: asStrings(p.capabilities),
      outputs: asStrings(p.outputs),
    }))
    .filter((p) => p.id);

  return {
    images,
    packages,
    infrastructureProviders,
    degraded: Boolean(raw._degraded),
    degradedReason: typeof raw._error === "string" ? raw._error : undefined,
  };
}

export async function fetchControlCatalog(): Promise<ControlCatalog> {
  const raw = await invoke<Record<string, unknown>>("catalog");
  return normalizeCatalog(raw ?? {});
}

export function useControlCatalog() {
  return useQuery({
    queryKey: ["valence-control", "catalog"],
    queryFn: fetchControlCatalog,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

function normalizeFindings(raw: unknown): PlanFinding[] {
  return asArray<Record<string, unknown>>(raw).map((f) => {
    const level = String(f.level ?? f.severity ?? "info").toLowerCase();
    return {
      level: level === "error" || level === "warning" ? (level as PlanFinding["level"]) : "info",
      code: String(f.code ?? "unknown"),
      message: String(f.message ?? ""),
      scope: (f.scope as Record<string, unknown>) ?? null,
    };
  });
}

export async function planBuild(intent: PlanIntent): Promise<PlanResponse> {
  const data = await invoke<Record<string, unknown>>("plan", { intent });
  return {
    resolved: data?.resolved,
    autoAdded: (data?.autoAdded as PlanResponse["autoAdded"]) ?? {
      packages: [],
      features: [],
      infrastructure: [],
    },
    findings: normalizeFindings(data?.findings),
  };
}

export async function generateBundle(intent: PlanIntent): Promise<BundleResult> {
  const data = await invoke<Record<string, unknown>>("bundle", { intent });
  if (data?.binary) return { files: [], binary: data.binary as BundleResult["binary"] };

  const rawFiles = Array.isArray(data?.files)
    ? (data.files as Record<string, unknown>[])
    : Array.isArray((data as { bundle?: { files?: unknown } })?.bundle?.files)
      ? ((data as { bundle: { files: Record<string, unknown>[] } }).bundle.files)
      : [];

  const files: BundleFile[] = rawFiles
    .map((f) => ({
      path: String(f.path ?? f.name ?? f.fileName ?? ""),
      contents: String(f.contents ?? f.content ?? f.text ?? ""),
      language: typeof f.language === "string" ? f.language : undefined,
    }))
    .filter((f) => f.path);

  if (!files.length) {
    throw new Error("The bundle service returned no files.");
  }
  return { files };
}
