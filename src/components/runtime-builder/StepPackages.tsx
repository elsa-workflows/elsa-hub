import { useMemo, useState } from "react";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import { PackageCard } from "./PackageCard";

export function StepPackages() {
  const { state, togglePackage, setPackageVersion } = useRuntimeBuilder();
  const { data: catalog, isLoading, error } = useCatalogQuery();
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const items = catalog?.packages ?? [];
    const term = filter.toLowerCase().trim();
    const filtered = term
      ? items.filter(
          (p) =>
            p.displayName.toLowerCase().includes(term) ||
            p.id.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term),
        )
      : items;
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog, filter]);

  const selectedMap = new Map(
    state.selectedPackages.map((p) => [p.packageId, p] as const),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Pick packages
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Capabilities are derived from package manifests. Select the packages
          your runtime needs; configure features in the next step.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, category, or package id"
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn't reach the catalog API.</p>
            <p className="text-xs opacity-80">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
          {catalog?.packages.length === 0
            ? "The catalog is empty — package manifests will appear here as they are published."
            : "No packages match your filter."}
        </div>
      )}

      {grouped.map(([category, packages]) => (
        <section key={category} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((pkg) => {
              const sel = selectedMap.get(pkg.id);
              return (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={Boolean(sel)}
                  selectedVersion={sel?.version ?? null}
                  onToggle={(version) => togglePackage(pkg.id, version)}
                  onVersionChange={(v) => setPackageVersion(pkg.id, v)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
