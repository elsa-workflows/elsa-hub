import { Loader2 } from "lucide-react";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import { findPackage } from "@/lib/runtime-builder/requirements";
import { FeatureRow } from "./FeatureRow";

export function StepFeatures() {
  const { state, toggleFeature } = useRuntimeBuilder();
  const { data: catalog, isLoading } = useCatalogQuery();

  if (isLoading || !catalog) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
      </div>
    );
  }

  if (state.selectedPackages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
        Select at least one package first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Choose features
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each package exposes one or more features. Pick the ones you want
          enabled — they determine which infrastructure your runtime needs.
        </p>
      </div>

      <div className="space-y-5">
        {state.selectedPackages.map((sp) => {
          const pkg = findPackage(catalog, sp.packageId);
          if (!pkg) return null;
          return (
            <section
              key={sp.packageId}
              className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl"
            >
              <header className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">
                  {pkg.displayName}
                </h3>
                <code className="font-mono text-[10px] text-muted-foreground">
                  {pkg.id} · {sp.version}
                </code>
              </header>
              {pkg.features.length === 0 ? (
                <p className="rounded-md border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
                  This package exposes no opt-in features.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {pkg.features.map((feature) => (
                    <FeatureRow
                      key={feature.id}
                      feature={feature}
                      selected={sp.selectedFeatures.includes(feature.id)}
                      onToggle={() => toggleFeature(pkg.id, feature.id, catalog)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
