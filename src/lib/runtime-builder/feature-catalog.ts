// Feature-first view over the package catalog.
//
// The builder's primary UX lets users pick *capabilities* (features) instead of
// NuGet packages. Each catalog package contributes 0-N features; we flatten
// them here, attach package context, and bucket them into a small set of
// user-facing categories.

import type { CatalogV2, PackageFeature, PackageManifest } from "./types-v2";

export type CapabilityCategory =
  | "Workflows"
  | "Triggers"
  | "Activities"
  | "Integrations"
  | "Scripting"
  | "Scheduling"
  | "Storage"
  | "Messaging"
  | "Observability"
  | "Identity"
  | "Other";

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  "Workflows",
  "Triggers",
  "Activities",
  "Integrations",
  "Scripting",
  "Scheduling",
  "Storage",
  "Messaging",
  "Observability",
  "Identity",
  "Other",
];

export interface CapabilityEntry {
  /** Stable global key: `${packageId}::${featureId}`. */
  key: string;
  feature: PackageFeature;
  package: PackageManifest;
  category: CapabilityCategory;
  /** Lowercased haystack for fast search. */
  haystack: string;
}

/**
 * Categorize a feature. Heuristic — looks at packageId, featureId, package
 * category, and tags. Each feature lands in exactly one bucket.
 */
export function categorizeFeature(
  feature: PackageFeature,
  pkg: PackageManifest,
): CapabilityCategory {
  const hay = [
    feature.id,
    feature.displayName,
    pkg.id,
    pkg.category,
    ...(pkg.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const has = (...needles: string[]) => needles.some((n) => hay.includes(n));

  if (has("scheduling", "quartz", "cron", "hangfire", "timer"))
    return "Scheduling";
  if (has("scripting", "javascript", "python", "liquid", "csharp.script"))
    return "Scripting";
  if (has("observability", "telemetry", "opentelemetry", "logging", "metrics"))
    return "Observability";
  if (has("identity", "authentication", "authorization", "openid", "oauth"))
    return "Identity";
  if (
    has(
      "messaging",
      "masstransit",
      "rabbitmq",
      "azure.servicebus",
      "kafka",
      "mqtt",
      "broker",
    )
  )
    return "Messaging";
  if (
    has(
      "storage",
      "persistence",
      "ef",
      "entityframework",
      "mongo",
      "dapper",
      "blob",
      "cache",
      "redis",
    )
  )
    return "Storage";
  if (
    has(
      "integration",
      "http",
      "webhook",
      "email",
      "smtp",
      "twilio",
      "sendgrid",
      "slack",
      "teams",
      "openai",
      "azure.openai",
    )
  )
    return "Integrations";
  if (has("trigger", "endpoint", "starter"))
    return "Triggers";
  if (has("activity", "activities"))
    return "Activities";
  if (
    has(
      "workflow",
      "workflows",
      "runtime",
      "management",
      "alteration",
      "designer",
    )
  )
    return "Workflows";
  return "Other";
}

export function buildCapabilityIndex(catalog: CatalogV2): CapabilityEntry[] {
  const out: CapabilityEntry[] = [];
  for (const pkg of catalog.packages) {
    for (const feature of pkg.features) {
      const category = categorizeFeature(feature, pkg);
      out.push({
        key: `${pkg.id}::${feature.id}`,
        feature,
        package: pkg,
        category,
        haystack: [
          feature.id,
          feature.displayName,
          feature.description ?? "",
          pkg.id,
          pkg.displayName,
          pkg.category,
          ...(pkg.tags ?? []),
        ]
          .join(" ")
          .toLowerCase(),
      });
    }
  }
  return out;
}

export function groupByCategory(
  entries: CapabilityEntry[],
): Map<CapabilityCategory, CapabilityEntry[]> {
  const map = new Map<CapabilityCategory, CapabilityEntry[]>();
  for (const cat of CAPABILITY_CATEGORIES) map.set(cat, []);
  for (const e of entries) {
    const list = map.get(e.category);
    if (list) list.push(e);
  }
  // Drop empty buckets.
  for (const [k, v] of map) if (v.length === 0) map.delete(k);
  return map;
}
