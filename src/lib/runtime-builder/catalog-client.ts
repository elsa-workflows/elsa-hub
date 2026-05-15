// Catalog client + React Query hooks. All HTTP traffic goes through the
// `runtime-builder-catalog` edge function so the API key stays server-side.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  BuilderStateV2,
  CatalogV2,
  InfrastructureProvider,
  PackageManifest,
  ResolveResponse,
} from "./types-v2";

async function invoke<T>(action: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke("runtime-builder-catalog", {
    body: { action, body },
  });
  if (error) throw new Error(error.message ?? "Catalog proxy error");
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as T;
}

function normalizeProvider(raw: unknown): InfrastructureProvider | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.kind !== "string") return null;
  const provider: InfrastructureProvider = {
    id: r.id,
    displayName: typeof r.displayName === "string" ? r.displayName : r.id,
    kind: r.kind as InfrastructureProvider["kind"],
    strategy: (typeof r.strategy === "string"
      ? r.strategy
      : "compose-sidecar") as InfrastructureProvider["strategy"],
    provider: typeof r.provider === "string" ? r.provider : r.id,
    capabilities: Array.isArray(r.capabilities) ? (r.capabilities as string[]) : [],
    outputs: Array.isArray(r.outputs) ? (r.outputs as string[]) : [],
    settings: Array.isArray(r.settings)
      ? (r.settings as InfrastructureProvider["settings"])
      : undefined,
  };
  return provider;
}

function normalizePackage(raw: unknown): PackageManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const versions = Array.isArray(r.versions) ? (r.versions as string[]) : [];
  const version =
    typeof r.version === "string" ? r.version : versions[0] ?? "0.0.0";
  return {
    id: r.id,
    displayName: typeof r.displayName === "string" ? r.displayName : r.id,
    description: typeof r.description === "string" ? r.description : undefined,
    version,
    versions: versions.length ? versions : [version],
    licenseTier: (r.licenseTier as PackageManifest["licenseTier"]) ?? "OSS",
    stability: (r.stability as PackageManifest["stability"]) ?? "Stable",
    category: typeof r.category === "string" ? r.category : "General",
    features: Array.isArray(r.features)
      ? (r.features as PackageManifest["features"])
      : [],
    conflictsWith: Array.isArray(r.conflictsWith)
      ? (r.conflictsWith as string[])
      : undefined,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : undefined,
  };
}

export async function fetchCatalog(): Promise<CatalogV2> {
  const raw = await invoke<{
    packages?: unknown[];
    infrastructureProviders?: unknown[];
  }>("catalog");
  const packages = (raw.packages ?? [])
    .map(normalizePackage)
    .filter((p): p is PackageManifest => p !== null);
  const infrastructureProviders = (raw.infrastructureProviders ?? [])
    .map(normalizeProvider)
    .filter((p): p is InfrastructureProvider => p !== null);
  // Dedupe providers by id, last write wins.
  const providerMap = new Map<string, InfrastructureProvider>();
  for (const p of infrastructureProviders) providerMap.set(p.id, p);
  return {
    packages,
    infrastructureProviders: Array.from(providerMap.values()),
  };
}

export interface ResolveRequest {
  packages: Array<{
    id: string;
    version: string;
    features: string[];
  }>;
  infrastructure: Array<{
    kind: string;
    providerId: string | null;
    strategy: string;
  }>;
}

export function buildResolveRequest(state: BuilderStateV2): ResolveRequest {
  return {
    packages: state.selectedPackages.map((p) => ({
      id: p.packageId,
      version: p.version,
      features: p.selectedFeatures,
    })),
    infrastructure: state.infrastructureSelections.map((i) => ({
      kind: i.kind,
      providerId: i.providerId,
      strategy: i.strategy,
    })),
  };
}

export async function resolveBuild(req: ResolveRequest): Promise<ResolveResponse> {
  const data = await invoke<ResolveResponse>("resolve", req);
  return {
    compatible: Boolean(data?.compatible),
    findings: Array.isArray(data?.findings) ? data.findings : [],
  };
}

export function useCatalogQuery() {
  return useQuery({
    queryKey: ["runtime-builder", "catalog"],
    queryFn: fetchCatalog,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useResolveQuery(state: BuilderStateV2, enabled = true) {
  const req = buildResolveRequest(state);
  return useQuery({
    queryKey: ["runtime-builder", "resolve", req],
    queryFn: () => resolveBuild(req),
    enabled: enabled && (req.packages.length > 0 || req.infrastructure.length > 0),
    staleTime: 30_000,
    retry: 0,
  });
}
