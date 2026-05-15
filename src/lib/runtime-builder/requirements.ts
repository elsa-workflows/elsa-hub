// Helpers that derive infrastructure requirements and capability summaries
// from the user's current package + feature selection.

import type {
  BuilderStateV2,
  CatalogV2,
  InfraKind,
  InfraRequirement,
  InfrastructureProvider,
  InfrastructureSelection,
  PackageFeature,
  PackageManifest,
  SelectedPackage,
} from "./types-v2";

export interface DerivedRequirement {
  kind: InfraKind;
  capabilities: string[];
  sources: Array<{
    packageId: string;
    featureId: string;
    featureName: string;
  }>;
}

export function findPackage(
  catalog: CatalogV2,
  packageId: string,
): PackageManifest | undefined {
  return catalog.packages.find((p) => p.id === packageId);
}

export function findFeature(
  pkg: PackageManifest | undefined,
  featureId: string,
): PackageFeature | undefined {
  return pkg?.features.find((f) => f.id === featureId);
}

export function findProvider(
  catalog: CatalogV2,
  providerId: string | null | undefined,
): InfrastructureProvider | undefined {
  if (!providerId) return undefined;
  return catalog.infrastructureProviders.find((p) => p.id === providerId);
}

export function providersForKind(
  catalog: CatalogV2,
  kind: InfraKind,
): InfrastructureProvider[] {
  return catalog.infrastructureProviders.filter((p) => p.kind === kind);
}

export function deriveInfrastructureRequirements(
  selectedPackages: SelectedPackage[],
  catalog: CatalogV2,
): DerivedRequirement[] {
  const map = new Map<InfraKind, DerivedRequirement>();

  for (const sp of selectedPackages) {
    const pkg = findPackage(catalog, sp.packageId);
    if (!pkg) continue;
    for (const featureId of sp.selectedFeatures) {
      const feature = findFeature(pkg, featureId);
      const reqs: InfraRequirement[] = feature?.requires?.infrastructure ?? [];
      for (const req of reqs) {
        if (req.optional) continue;
        const existing = map.get(req.kind);
        const capabilities = req.capabilities ?? [];
        const source = {
          packageId: pkg.id,
          featureId,
          featureName: feature?.displayName ?? featureId,
        };
        if (existing) {
          for (const c of capabilities) {
            if (!existing.capabilities.includes(c)) existing.capabilities.push(c);
          }
          existing.sources.push(source);
        } else {
          map.set(req.kind, {
            kind: req.kind,
            capabilities: [...capabilities],
            sources: [source],
          });
        }
      }
    }
  }

  return Array.from(map.values());
}

export function pickDefaultProvider(
  catalog: CatalogV2,
  req: DerivedRequirement,
): InfrastructureProvider | undefined {
  const candidates = providersForKind(catalog, req.kind);
  // Prefer compose-sidecar that satisfies all required capabilities.
  const matchesAll = (p: InfrastructureProvider) =>
    req.capabilities.every((c) => p.capabilities.includes(c));
  return (
    candidates.find((p) => p.strategy === "compose-sidecar" && matchesAll(p)) ??
    candidates.find(matchesAll) ??
    candidates[0]
  );
}

export function autoFillInfrastructure(
  state: BuilderStateV2,
  catalog: CatalogV2,
): InfrastructureSelection[] {
  const required = deriveInfrastructureRequirements(state.selectedPackages, catalog);
  const existing = new Map(
    state.infrastructureSelections.map((s) => [s.kind, s] as const),
  );
  const next: InfrastructureSelection[] = [];

  for (const req of required) {
    const current = existing.get(req.kind);
    if (current) {
      next.push(current);
      continue;
    }
    const provider = pickDefaultProvider(catalog, req);
    next.push({
      kind: req.kind,
      providerId: provider?.id ?? null,
      strategy: provider?.strategy ?? "none",
      settings: {},
    });
  }

  // Keep manually added selections for kinds that are no longer required so the
  // user doesn't lose their work; mark them by appending after required ones.
  for (const sel of state.infrastructureSelections) {
    if (!next.some((n) => n.kind === sel.kind)) next.push(sel);
  }

  return next;
}
