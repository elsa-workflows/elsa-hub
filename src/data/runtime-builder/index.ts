import type { Catalog } from "@/lib/runtime-builder/types";
import { runtimeImages } from "./runtimeImages";
import { capabilities } from "./capabilities";
import { featureSchemas } from "./featureSchemas";
import { compatibilityRules } from "./compatibility";

export const CATALOG_VERSION = "2026.05.15";

export const catalog: Catalog = {
  version: CATALOG_VERSION,
  images: runtimeImages,
  capabilities,
  schemas: featureSchemas,
  rules: compatibilityRules,
};

// Promise-shaped loader so consumers can swap to a real fetch later
// without changing call sites.
export async function loadCatalog(): Promise<Catalog> {
  return catalog;
}

export {
  runtimeImages,
  capabilities,
  featureSchemas,
  compatibilityRules,
};
