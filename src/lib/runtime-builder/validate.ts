import type {
  BuilderState,
  Catalog,
  ValidationFinding,
  ValidationResult,
} from "./types";
import { findImage, findCapability, findSchema } from "./catalog-utils";

/**
 * Pure validation: given the builder state and catalog, return findings.
 * No side effects, no React.
 */
export function validateBuild(state: BuilderState, catalog: Catalog): ValidationResult {
  const errors: ValidationFinding[] = [];
  const warnings: ValidationFinding[] = [];
  const passes: ValidationFinding[] = [];

  // 1. Image must be selected.
  const image = findImage(catalog, state.imageId);
  if (!image) {
    errors.push({
      level: "error",
      code: "NO_IMAGE",
      message: "Pick a runtime image to begin.",
      scope: { kind: "image" },
    });
    return finalize(errors, warnings, passes);
  }
  passes.push({
    level: "info",
    code: "IMAGE_OK",
    message: `Runtime image: ${image.displayName} ${state.imageVersion ?? image.versions[0]}`,
    scope: { kind: "image" },
  });

  // 2. Capabilities supported by the image.
  for (const capId of state.capabilityIds) {
    const cap = findCapability(catalog, capId);
    if (!cap) continue;
    if (!image.capabilities.includes(capId)) {
      errors.push({
        level: "error",
        code: "INCOMPATIBLE_CAPABILITY",
        message: `${cap.displayName} is not supported by ${image.displayName}.`,
        scope: { kind: "capability", capabilityId: capId },
      });
    }
  }

  // 3. Capability dependencies + conflicts.
  const enabledSet = new Set(state.capabilityIds);
  for (const capId of state.capabilityIds) {
    const cap = findCapability(catalog, capId);
    if (!cap) continue;

    for (const dep of cap.dependencies ?? []) {
      if (!enabledSet.has(dep)) {
        const depCap = findCapability(catalog, dep);
        errors.push({
          level: "error",
          code: "MISSING_DEPENDENCY",
          message: `${cap.displayName} requires ${depCap?.displayName ?? dep}.`,
          scope: { kind: "capability", capabilityId: capId },
        });
      }
    }
    for (const conflict of cap.conflicts ?? []) {
      if (enabledSet.has(conflict)) {
        const other = findCapability(catalog, conflict);
        errors.push({
          level: "error",
          code: "CONFLICT",
          message: `${cap.displayName} conflicts with ${other?.displayName ?? conflict}.`,
          scope: { kind: "capability", capabilityId: capId },
        });
      }
    }
  }

  // 4. Required feature settings.
  for (const capId of state.capabilityIds) {
    const cap = findCapability(catalog, capId);
    if (!cap) continue;
    for (const featureRef of cap.features) {
      const schema = findSchema(catalog, featureRef.id);
      if (!schema) continue;
      const values = state.settings[featureRef.id] ?? {};
      for (const setting of schema.settings) {
        if (!setting.required) continue;
        const value = values[setting.name];
        const empty = value === undefined || value === null || value === "";
        if (empty) {
          errors.push({
            level: "error",
            code: "REQUIRED_SETTING",
            message: `${schema.displayName}: "${setting.displayName}" is required.`,
            scope: {
              kind: "feature",
              featureId: featureRef.id,
              settingName: setting.name,
            },
          });
        }
      }
    }
  }

  // 5. Compatibility rules.
  for (const rule of catalog.rules) {
    if (rule.forImages && !rule.forImages.includes(image.id)) continue;

    const allMatch = (rule.ifAll ?? []).every((id) => enabledSet.has(id));
    const anyMatch =
      !rule.ifAny || rule.ifAny.some((id) => enabledSet.has(id));
    const missingMatch = (rule.ifMissing ?? []).every((id) => !enabledSet.has(id));

    const triggers =
      (rule.ifAll ? allMatch : true) &&
      (rule.ifAny ? anyMatch : true) &&
      (rule.ifMissing ? missingMatch : true);

    if (!triggers) continue;

    const finding: ValidationFinding = {
      level: rule.level,
      code: rule.code,
      message: rule.message,
    };
    if (rule.level === "error") errors.push(finding);
    else if (rule.level === "warning") warnings.push(finding);
    else passes.push(finding);
  }

  // 6. Generic "looks healthy" pass.
  if (state.capabilityIds.length > 0) {
    passes.push({
      level: "info",
      code: "CAPABILITIES_OK",
      message: `${state.capabilityIds.length} capability(ies) configured.`,
    });
  }

  return finalize(errors, warnings, passes);
}

function finalize(
  errors: ValidationFinding[],
  warnings: ValidationFinding[],
  passes: ValidationFinding[],
): ValidationResult {
  const isValid = errors.length === 0;
  // Naive readiness: passes / (passes + warnings + errors), capped.
  const total = passes.length + warnings.length + errors.length || 1;
  const score = (passes.length - errors.length * 1.5) / total;
  const readiness = Math.max(0, Math.min(100, Math.round(score * 100)));
  return { errors, warnings, passes, isValid, readiness };
}
