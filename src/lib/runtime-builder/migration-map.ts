// Reserved for future v1 → v2 best-effort mapping. v1 was preview-only and
// shipped with sample data; existing persisted state is reset to v2 on load.
// When real v1 builds exist in the wild we will map them here.

import type { BuilderStateV2 } from "./types-v2";

export interface LegacyV1Snapshot {
  imageId?: string | null;
  imageVersion?: string | null;
  capabilityIds?: string[];
  settings?: Record<string, Record<string, unknown>>;
  overrides?: Record<string, string>;
  advancedMode?: boolean;
  meta?: BuilderStateV2["meta"];
}

export function isLegacyV1Snapshot(value: unknown): value is LegacyV1Snapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return "imageId" in v || "capabilityIds" in v;
}
