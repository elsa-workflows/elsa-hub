// Dependency resolver for the runtime builder.
// Dependencies live on features (`PackageFeature.dependencies`) — package-level
// dependencies are derived by following those feature deps through a
// `featureId -> packageId` index built across the whole catalog.

import type {
  CatalogV2,
  FeatureDependency,
  PackageManifest,
  SelectedPackage,
} from "./types-v2";

export interface FeatureRef {
  packageId: string;
  featureId: string;
}

/** Map every known featureId to the package that hosts it. */
export function buildFeatureIndex(catalog: CatalogV2): Map<string, FeatureRef> {
  const map = new Map<string, FeatureRef>();
  for (const pkg of catalog.packages) {
    for (const feat of pkg.features) {
      // First-seen wins; downstream features keep their package association.
      if (!map.has(feat.id)) {
        map.set(feat.id, { packageId: pkg.id, featureId: feat.id });
      }
    }
  }
  return map;
}

function findPackage(catalog: CatalogV2, id: string): PackageManifest | undefined {
  return catalog.packages.find((p) => p.id === id);
}

function nonOptionalDeps(deps: FeatureDependency[] | undefined): FeatureDependency[] {
  if (!deps) return [];
  return deps.filter((d) => !d.optional);
}

/**
 * Walk the dependency graph starting from each selected package.
 *
 * For each selected package we look at its "required features" set:
 *   - user-explicit selectedFeatures, plus
 *   - auto-ticked autoFeatures (these came from a prior closure pass)
 * For packages that have no required features yet (freshly added by the user),
 * we DO NOT auto-tick any features — the user picks them in the Features step
 * and dependency resolution re-runs at that point. We still include the
 * package itself in the closure.
 *
 * Returns:
 *   packageIds: every package that must be selected (seeds + transitive deps).
 *   autoFeatures: per-package set of features pulled in by dependencies.
 */
export function resolveClosure(
  catalog: CatalogV2,
  selected: SelectedPackage[],
): {
  packageIds: Set<string>;
  autoFeatures: Map<string, Set<string>>;
} {
  const index = buildFeatureIndex(catalog);
  const packageIds = new Set<string>();
  const autoFeatures = new Map<string, Set<string>>();

  // Track which (packageId, featureId) pairs we've already expanded to avoid
  // infinite loops on cycles.
  const visitedFeatures = new Set<string>();
  const queue: FeatureRef[] = [];

  function addAutoFeature(packageId: string, featureId: string) {
    let set = autoFeatures.get(packageId);
    if (!set) {
      set = new Set<string>();
      autoFeatures.set(packageId, set);
    }
    set.add(featureId);
  }

  // Seed: include every selected package, and queue its required features.
  const seedFeatureIds = new Map<string, Set<string>>();
  for (const sp of selected) {
    packageIds.add(sp.packageId);
    const set = new Set<string>([...sp.selectedFeatures, ...(sp.autoFeatures ?? [])]);
    seedFeatureIds.set(sp.packageId, set);
    for (const fid of set) {
      queue.push({ packageId: sp.packageId, featureId: fid });
    }
  }

  while (queue.length > 0) {
    const ref = queue.shift()!;
    const key = `${ref.packageId}::${ref.featureId}`;
    if (visitedFeatures.has(key)) continue;
    visitedFeatures.add(key);

    const pkg = findPackage(catalog, ref.packageId);
    if (!pkg) continue;
    const feat = pkg.features.find((f) => f.id === ref.featureId);
    if (!feat) continue;

    for (const dep of nonOptionalDeps(feat.dependencies)) {
      // Resolve dependency target to a concrete package + feature.
      let targetPkgId = dep.packageId;
      if (!targetPkgId) {
        const located = index.get(dep.featureId);
        if (!located) {
          if (typeof console !== "undefined" && import.meta.env?.DEV) {
            console.warn(
              `[runtime-builder] dependency featureId not found in catalog: ${dep.featureId} (from ${ref.packageId}/${ref.featureId})`,
            );
          }
          continue;
        }
        targetPkgId = located.packageId;
      }
      packageIds.add(targetPkgId);
      // If the target package isn't the same as the originating one, mark the
      // feature as auto-ticked. (Same-package deps would just re-enable a
      // sibling feature; we leave that to the user too — keep it conservative.)
      if (targetPkgId !== ref.packageId) {
        addAutoFeature(targetPkgId, dep.featureId);
      }
      queue.push({ packageId: targetPkgId, featureId: dep.featureId });
    }
  }

  return { packageIds, autoFeatures };
}

/**
 * Merge the closure back into the selection list.
 *
 * - Preserves user-selected packages and their versions verbatim.
 * - Adds missing transitively-required packages, marking them autoAdded.
 * - Removes auto-added packages that are no longer required (orphans).
 * - Merges new autoFeatures into each package's `autoFeatures` set; also
 *   reflects them in `selectedFeatures` (so the generator/validator see them).
 */
export function applyClosure(
  catalog: CatalogV2,
  selected: SelectedPackage[],
): SelectedPackage[] {
  // 1. Orphan detection: run a closure seeded only from user-pinned packages
  //    (and their user-selected features). Any auto-added package missing from
  //    the result is orphaned and should be pruned.
  const userPinned = selected.filter((p) => p.autoAdded !== true);
  // Strip autoFeatures from the orphan-detection seed so removed user
  // selections don't keep packages alive via leftover auto flags.
  const orphanSeed = userPinned.map((p) => ({
    ...p,
    autoFeatures: undefined,
  }));
  const orphanClosure = resolveClosure(catalog, orphanSeed);
  const survivors = selected.filter((p) => {
    if (p.autoAdded !== true) return true;
    return orphanClosure.packageIds.has(p.packageId);
  });

  // 2. Full closure (including auto-added survivors) to compute the final
  //    set of required packages and per-package auto-features.
  const { packageIds, autoFeatures } = resolveClosure(catalog, survivors);
  const byId = new Map(survivors.map((p) => [p.packageId, p] as const));
  const out: SelectedPackage[] = [];

  for (const sp of survivors) {
    const auto = autoFeatures.get(sp.packageId);
    const mergedAuto = new Set<string>(auto ?? []);
    // User selections trump auto-flags.
    for (const f of sp.selectedFeatures) mergedAuto.delete(f);
    const mergedSelected = Array.from(
      new Set<string>([...sp.selectedFeatures, ...mergedAuto]),
    );
    out.push({
      ...sp,
      selectedFeatures: mergedSelected,
      autoFeatures: mergedAuto.size ? Array.from(mergedAuto) : undefined,
    });
  }

  for (const id of packageIds) {
    if (byId.has(id)) continue;
    const pkg = findPackage(catalog, id);
    if (!pkg) continue;
    const auto = autoFeatures.get(id);
    const autoArr = auto ? Array.from(auto) : [];
    out.push({
      packageId: id,
      version: pkg.version,
      selectedFeatures: [...autoArr],
      settings: {},
      autoAdded: true,
      autoFeatures: autoArr.length ? autoArr : undefined,
    });
  }

  return out;
}
