## Goal

When a user selects a package (or a feature inside a package), automatically select any other packages and features it transitively depends on, so the build is always installable without the user having to hunt down required packages.

## What the catalog actually returns

Dependencies live on **features**, not packages:

```jsonc
{
  "featureId": "Elsa.Elsa",
  "dependencies": [
    { "packageId": null, "featureId": "Elsa.WorkflowManagement", "optional": false },
    { "packageId": null, "featureId": "Elsa.WorkflowRuntime",    "optional": false }
  ]
}
```

Observations from a live catalog dump (37 packages, 69 dependency entries):
- `packageId` is currently always `null` — the dependency is identified purely by `featureId`.
- Many dependency `featureId`s belong to **other packages** (e.g. `Elsa` → features that live in `Elsa.Workflows.Management` and `Elsa.Workflows.Runtime`).
- A few `featureId`s in the dependency list don't match any known feature exactly (whitespace / casing drift). Those will be treated as best-effort and silently skipped — never throw.

So "package dependencies" must be **derived** from feature dependencies via a `featureId → packageId` index built over the whole catalog.

## Design

### 1. Catalog model — surface dependencies

`src/lib/runtime-builder/types-v2.ts`
- Add `dependencies?: FeatureDependency[]` to `PackageFeature`.
- New type: `FeatureDependency { featureId: string; packageId?: string; optional?: boolean; reason?: string }`.

`src/lib/runtime-builder/catalog-client.ts`
- In `normalizeFeature`, map `dependencies` from the raw payload (filtering out `optional === true` is **not** done here — keep the data; the resolver decides).

### 2. Dependency resolver (pure)

New file `src/lib/runtime-builder/dependencies.ts`:

```ts
export interface FeatureRef { packageId: string; featureId: string }

export function buildFeatureIndex(catalog: CatalogV2): Map<string, FeatureRef>
// Map from featureId → { packageId, featureId } using each package's
// currently chosen `version` (the normalized one already on PackageManifest).

export function resolveRequiredPackages(
  catalog: CatalogV2,
  seedPackageIds: string[],
): { packageIds: Set<string>; features: Map<string, Set<string>> }
// BFS:
//   - Start with seed packages.
//   - For each package, look at *required* features (see §3 below) and
//     follow each non-optional dependency.
//   - Resolve dep.featureId via the index → adds the host packageId and
//     records the depended-on featureId on that package.
//   - Repeat until fixed point. Ignore optional deps and unknown featureIds.

export function resolveRequiredFeaturesForSelection(
  catalog: CatalogV2,
  selected: SelectedPackage[],
): Map<string, Set<string>>
// Same BFS but seeded with the user's explicitly-selected features per
// package (used when the Features step toggles things).
```

### 3. What counts as "required" inside a freshly added package?

A package may expose many features, only some of which are needed at runtime. To avoid silently enabling everything, the resolver treats as required:

1. Features the user has already ticked in the Features step (`SelectedPackage.selectedFeatures`).
2. For packages that were **auto-added** as a dependency, only the specific featureIds that pulled them in.
3. For packages the user **explicitly added**, no features are auto-ticked. The user still picks features in step 3. Dependency resolution re-runs when they tick a feature.

This keeps the package list complete without surprise-enabling features the user never asked for.

### 4. Store wiring

`src/lib/runtime-builder/store.ts`
- Add an internal helper `applyDependencyClosure(state, catalog)` (catalog passed in — store stays catalog-agnostic by accepting it via the actions that need it).
- Extend two actions to take the catalog and run the closure after mutating:
  - `togglePackage(packageId, version, catalog?)` — on **add**, append missing transitively-required packages (picking each package's default `version`). On **remove**, also remove packages that are now orphaned (no longer required by any remaining selection and were not user-pinned — see §5).
  - `toggleFeature(packageId, featureId, catalog?)` — on **add**, add any newly required packages + auto-tick the specific dependent featureIds on those packages. On **remove**, recompute and prune orphans.
- New flag on `SelectedPackage`: `autoAdded?: boolean` (and `autoFeatures?: string[]` for features pulled in by dependencies). User-toggled selections clear `autoAdded`. Orphan pruning only removes packages where `autoAdded === true`.

The `catalog?` arg is optional so existing call sites (and persisted state hydration) keep working; when omitted, the actions behave as today (no resolution).

### 5. UI integration

- `StepPackages.tsx` already calls `togglePackage(pkg.id, pkg.version)` — update those two call sites to pass `catalog` from `useCatalogQuery()`.
- `StepFeatures.tsx` / `FeatureRow.tsx` — pass `catalog` into `toggleFeature`.
- `PackageCard` / `PackageListRow` — when rendering a selected package that was auto-added, show a subtle muted badge "Required by <pkgId>" (tooltip lists the chain). Non-blocking; purely informational.
- `RuntimeBuilderComposer.tsx` already pre-selects via `?package=` — same treatment, pass catalog.
- Toast (sonner) once per user action when ≥1 package is auto-added: *"Added N required package(s)"*. No toast for feature-only auto-ticks (too chatty).

### 6. Edge cases & safety

- **Cycles**: BFS with a visited set; cycles terminate naturally.
- **Optional deps** (`optional: true`): never auto-added. Surface them later as a hint in the Validate step (out of scope here).
- **Unknown featureIds**: skipped silently; logged once to `console.warn` in dev for diagnostics.
- **Version selection for auto-added packages**: use the catalog's normalized `version` (latest). User can change it afterward in the card.
- **Removing a user-selected package** that other selections depend on: keep the existing behavior (allow removal); the resolver will re-add it because it's still required. This makes the requirement obvious — the package "snaps back". Alternative (block removal with toast) is rejected as it feels punitive.

### 7. Tests

`src/test/runtime-builder.dependencies.test.ts` (vitest):
- Index build from a synthetic catalog.
- Single-step package closure.
- Multi-hop chain (`A → B → C`).
- Cycle (`A ↔ B`) terminates.
- Optional dep is not pulled in.
- Orphan pruning leaves user-pinned packages alone, removes auto-added ones.
- Feature-triggered closure auto-ticks the right feature on the dep package.

## Out of scope

- Server-side `resolve` enhancements (the API already returns findings; we're doing client-side prevention).
- Version-range checking (`versionRange` on deps is currently always `null`).
- UI for surfacing optional/recommended dependencies — separate follow-up.

## Files touched

- `src/lib/runtime-builder/types-v2.ts` — new `FeatureDependency`, fields on `PackageFeature` & `SelectedPackage`.
- `src/lib/runtime-builder/catalog-client.ts` — map `dependencies` in `normalizeFeature`.
- `src/lib/runtime-builder/dependencies.ts` — **new** resolver.
- `src/lib/runtime-builder/store.ts` — closure on `togglePackage` / `toggleFeature`, orphan pruning.
- `src/components/runtime-builder/StepPackages.tsx` — pass `catalog`, toast.
- `src/components/runtime-builder/StepFeatures.tsx` + `FeatureRow.tsx` — pass `catalog`.
- `src/components/runtime-builder/PackageCard.tsx` + `PackageListRow.tsx` — "Required by" badge.
- `src/pages/enterprise/RuntimeBuilderComposer.tsx` — pass `catalog` to the `?package=` preselect.
- `src/test/runtime-builder.dependencies.test.ts` — **new**.
