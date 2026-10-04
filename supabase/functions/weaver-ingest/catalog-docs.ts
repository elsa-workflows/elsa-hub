export type PackageDoc = {
  source: "package";
  external_id: string;
  url: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
};

type CatalogFeature = { featureId?: string; id?: string; displayName?: string; name?: string; description?: string };
type CatalogVersion = { version?: string; features?: CatalogFeature[] };
export type CatalogPackage = {
  packageId?: string;
  id?: string;
  displayName?: string;
  description?: string;
  latestVersion?: string;
  source?: { name?: string };
  versions?: CatalogVersion[];
  features?: CatalogFeature[];
};

function latestFeatures(pkg: CatalogPackage): CatalogFeature[] {
  const versions = pkg.versions ?? [];
  const latest = versions.find((v) => v.version === pkg.latestVersion) ?? versions[versions.length - 1];
  return latest?.features ?? pkg.features ?? [];
}

export function buildPackageDocs(catalog: { packages?: CatalogPackage[] }, siteBase: string): PackageDoc[] {
  // The catalog lists most packages once per feed (NuGet and Feedz). Keep one per id, NuGet first.
  const byId = new Map<string, CatalogPackage>();
  for (const pkg of catalog.packages ?? []) {
    const id = pkg.packageId ?? pkg.id;
    if (!id) continue;
    const seen = byId.get(id);
    if (!seen || (seen.source?.name !== "NuGet" && pkg.source?.name === "NuGet")) byId.set(id, pkg);
  }
  return [...byId].map(([id, pkg]) => {
    const name = pkg.displayName ?? id;
    const features = latestFeatures(pkg)
      .map((f) => {
        const fid = f.featureId ?? f.id;
        return `- ${fid}: ${f.displayName ?? f.name ?? fid}${f.description ? `: ${f.description}` : ""}`;
      })
      .join("\n");
    return {
      source: "package",
      external_id: `package:${id}`,
      url: `${siteBase}/elsa-plus/runtime-builder`,
      title: `Package: ${name}`,
      body: `${name} (id: ${id}, version: ${pkg.latestVersion ?? "unknown"}). ${pkg.description ?? ""}\n\nFeatures:\n${features || "(no features declared)"}`,
      metadata: { packageId: id, version: pkg.latestVersion ?? null, feed: pkg.source?.name ?? null, kind: "package" },
    };
  });
}

/** Skip package prune if any catalog entry lacked an id, or if no valid docs were built. */
export function packageDocsPruneOk(
  catalog: { packages?: CatalogPackage[] },
  docs: PackageDoc[],
): boolean {
  const skippedMissingId = (catalog.packages ?? []).some((pkg) => !(pkg.packageId ?? pkg.id));
  return !skippedMissingId && docs.length > 0;
}
