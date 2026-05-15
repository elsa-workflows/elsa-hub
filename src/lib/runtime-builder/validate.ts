// Local validation of a v2 builder state. The API resolve call is the
// authoritative source of truth — local validation provides immediate UX
// feedback for things we can detect without a round trip.

import type {
  BuilderStateV2,
  CatalogV2,
  ResolveFinding,
  ResolveResponse,
} from "./types-v2";
import {
  deriveInfrastructureRequirements,
  findFeature,
  findPackage,
  findProvider,
} from "./requirements";

export interface ValidationFindingV2 extends ResolveFinding {}

export interface ValidationResultV2 {
  errors: ValidationFindingV2[];
  warnings: ValidationFindingV2[];
  passes: ValidationFindingV2[];
  isValid: boolean;
  readiness: number;
}

export function validateBuildV2(
  state: BuilderStateV2,
  catalog: CatalogV2,
  apiResult?: ResolveResponse,
): ValidationResultV2 {
  const errors: ValidationFindingV2[] = [];
  const warnings: ValidationFindingV2[] = [];
  const passes: ValidationFindingV2[] = [];

  if (state.selectedPackages.length === 0) {
    errors.push({
      level: "error",
      code: "NO_PACKAGES",
      message: "Pick at least one package to build a runtime.",
      scope: { kind: "global" },
    });
  } else {
    passes.push({
      level: "info",
      code: "PACKAGES_OK",
      message: `${state.selectedPackages.length} package(s) selected.`,
      scope: { kind: "global" },
    });
  }

  // 1. Required feature settings.
  for (const sp of state.selectedPackages) {
    const pkg = findPackage(catalog, sp.packageId);
    if (!pkg) {
      errors.push({
        level: "error",
        code: "UNKNOWN_PACKAGE",
        message: `Package ${sp.packageId} is not in the current catalog.`,
        scope: { kind: "package", packageId: sp.packageId },
      });
      continue;
    }
    if (pkg.stability === "Preview" || pkg.stability === "Experimental") {
      warnings.push({
        level: "warning",
        code: "PREVIEW_PACKAGE",
        message: `${pkg.displayName} is ${pkg.stability.toLowerCase()}; use with care.`,
        scope: { kind: "package", packageId: sp.packageId },
      });
    }
    for (const featureId of sp.selectedFeatures) {
      const feature = findFeature(pkg, featureId);
      if (!feature) continue;
      const values = sp.settings[featureId] ?? {};
      for (const setting of feature.settings) {
        if (!setting.required) continue;
        const v = values[setting.name];
        if (v === undefined || v === null || v === "") {
          errors.push({
            level: "error",
            code: "REQUIRED_SETTING",
            message: `${feature.displayName}: "${setting.displayName}" is required.`,
            scope: { kind: "feature", packageId: pkg.id, featureId },
          });
        }
      }
    }
  }

  // 2. Conflicts between selected packages.
  const selectedIds = new Set(state.selectedPackages.map((p) => p.packageId));
  for (const sp of state.selectedPackages) {
    const pkg = findPackage(catalog, sp.packageId);
    if (!pkg?.conflictsWith) continue;
    for (const conflictId of pkg.conflictsWith) {
      if (selectedIds.has(conflictId)) {
        errors.push({
          level: "error",
          code: "PACKAGE_CONFLICT",
          message: `${pkg.displayName} conflicts with ${conflictId}.`,
          scope: { kind: "package", packageId: pkg.id },
        });
      }
    }
  }

  // 3. Infrastructure coverage.
  const requirements = deriveInfrastructureRequirements(
    state.selectedPackages,
    catalog,
  );
  for (const req of requirements) {
    const sel = state.infrastructureSelections.find((i) => i.kind === req.kind);
    if (!sel || (sel.providerId === null && sel.strategy !== "none")) {
      errors.push({
        level: "error",
        code: "MISSING_INFRA",
        message: `Pick a ${req.kind} provider; required by ${req.sources.map((s) => s.featureName).join(", ")}.`,
        scope: { kind: "infrastructure", infraKind: req.kind },
      });
      continue;
    }
    if (sel.strategy === "none") {
      warnings.push({
        level: "warning",
        code: "INFRA_NONE",
        message: `${req.kind}: marked as "none" — features depending on it may fail at runtime.`,
        scope: { kind: "infrastructure", infraKind: req.kind },
      });
      continue;
    }
    const provider = findProvider(catalog, sel.providerId);
    if (!provider) continue;
    const missingCaps = req.capabilities.filter(
      (c) => !provider.capabilities.includes(c),
    );
    if (missingCaps.length > 0) {
      warnings.push({
        level: "warning",
        code: "INFRA_CAP_GAP",
        message: `${provider.displayName} is missing capabilities: ${missingCaps.join(", ")}.`,
        scope: { kind: "infrastructure", infraKind: req.kind },
      });
    }
    if (sel.strategy === "external-service") {
      // Look for at least one settings value if the provider has settings defined.
      const hasSettings = provider.settings && provider.settings.length > 0;
      const filled = Object.values(sel.settings ?? {}).some(
        (v) => v !== undefined && v !== "",
      );
      if (hasSettings && !filled) {
        warnings.push({
          level: "warning",
          code: "EXTERNAL_NO_CONFIG",
          message: `${provider.displayName}: configure connection details for the external service.`,
          scope: { kind: "infrastructure", infraKind: req.kind },
        });
      }
    } else {
      passes.push({
        level: "info",
        code: "INFRA_OK",
        message: `${req.kind}: ${provider.displayName} (${strategyLabel(sel.strategy)}).`,
        scope: { kind: "infrastructure", infraKind: req.kind },
      });
    }
  }

  // 4. Merge API findings — they win on duplicate codes.
  if (apiResult) {
    const codes = new Set(
      [...errors, ...warnings, ...passes].map((f) => f.code + "|" + (f.scope?.kind ?? "")),
    );
    for (const f of apiResult.findings) {
      const key = f.code + "|" + (f.scope?.kind ?? "");
      if (codes.has(key)) continue;
      if (f.level === "error") errors.push(f);
      else if (f.level === "warning") warnings.push(f);
      else passes.push(f);
    }
  }

  return finalize(errors, warnings, passes);
}

function strategyLabel(s: string) {
  switch (s) {
    case "compose-sidecar":
      return "compose";
    case "external-service":
      return "external";
    case "managed":
      return "managed";
    default:
      return s;
  }
}

function finalize(
  errors: ValidationFindingV2[],
  warnings: ValidationFindingV2[],
  passes: ValidationFindingV2[],
): ValidationResultV2 {
  const isValid = errors.length === 0;
  const total = passes.length + warnings.length + errors.length || 1;
  const score = (passes.length - errors.length * 1.5) / total;
  const readiness = Math.max(0, Math.min(100, Math.round(score * 100)));
  return { errors, warnings, passes, isValid, readiness };
}
