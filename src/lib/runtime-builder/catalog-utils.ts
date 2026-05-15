import type {
  Catalog,
  Capability,
  FeatureSchema,
  RuntimeImage,
  SettingSchema,
} from "./types";

export function findImage(catalog: Catalog, id: string | null): RuntimeImage | undefined {
  if (!id) return undefined;
  return catalog.images.find((image) => image.id === id);
}

export function findCapability(catalog: Catalog, id: string): Capability | undefined {
  return catalog.capabilities.find((cap) => cap.id === id);
}

export function findSchema(catalog: Catalog, featureId: string): FeatureSchema | undefined {
  return catalog.schemas.find((schema) => schema.featureId === featureId);
}

export function getDefaultsForSchema(schema: FeatureSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const setting of schema.settings) {
    if (setting.defaultValue !== undefined) {
      out[setting.name] = setting.defaultValue;
    } else if (setting.type === "boolean") {
      out[setting.name] = false;
    } else {
      out[setting.name] = "";
    }
  }
  return out;
}

export function getResolvedFeatures(catalog: Catalog, capabilityIds: string[]) {
  return capabilityIds
    .map((id) => findCapability(catalog, id))
    .filter((cap): cap is Capability => Boolean(cap))
    .flatMap((cap) =>
      cap.features.map((feature) => ({ capability: cap, feature })),
    );
}

export function flattenSettings(settings: SettingSchema[]): SettingSchema[] {
  const out: SettingSchema[] = [];
  for (const s of settings) {
    out.push(s);
    if (s.settings) out.push(...flattenSettings(s.settings));
  }
  return out;
}

export function envVarFromHint(hint: string): string {
  return hint.replace(/[^A-Z0-9_]/gi, "_").toUpperCase();
}
