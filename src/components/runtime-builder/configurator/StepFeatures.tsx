import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertTriangle, Search } from "lucide-react";
import { useControlCatalog } from "@/lib/runtime-builder/control-api";
import {
  findImage,
  flattenFeatures,
  useConfigurator,
} from "@/lib/runtime-builder/configurator-store";

export function StepFeatures() {
  const { data: catalog, isLoading } = useControlCatalog();
  const { state, toggleFeature, isFeatureSelected } = useConfigurator();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const image = findImage(catalog, state.imageSlug);
  const features = useMemo(() => flattenFeatures(catalog, image), [catalog, image]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const f of features) {
      for (const c of f.categories.length ? f.categories : [f.category ?? "Other"]) {
        if (c) set.add(c);
      }
    }
    return ["all", ...[...set].sort()];
  }, [features]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.filter((f) => {
      const cats = f.categories.length ? f.categories : [f.category ?? "Other"];
      if (category !== "all" && !cats.includes(category)) return false;
      if (!q) return true;
      return (
        f.displayName.toLowerCase().includes(q) ||
        f.featureId.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q) ||
        f.packageDisplayName.toLowerCase().includes(q)
      );
    });
  }, [features, query, category]);

  const selectedCount = Object.keys(state.features).length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Features</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Choose the capabilities to enable. Only features compatible with{" "}
          <span className="text-foreground">{image?.displayName ?? "your runtime"}</span>{" "}
          are listed — {features.length} available, {selectedCount} selected.
        </p>
      </header>

      {!image && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Pick a runtime first.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features, packages…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              category === c
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((feature) => {
            const checked = isFeatureSelected(feature.featureId);
            return (
              <label
                key={feature.featureId}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-4 transition",
                  checked
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-card/40 hover:border-border",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleFeature(feature)}
                  className="mt-0.5"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{feature.displayName}</span>
                    {feature.experimental && (
                      <Badge variant="outline" className="text-[10px]">
                        experimental
                      </Badge>
                    )}
                    {feature.infrastructure.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        needs infrastructure
                      </Badge>
                    )}
                  </div>
                  {feature.description && (
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  )}
                  <p className="truncate font-mono text-[10px] text-muted-foreground/70">
                    {feature.packageId} · {feature.version}
                  </p>
                </div>
              </label>
            );
          })}
          {!visible.length && (
            <p className="text-sm text-muted-foreground">No features match your filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
