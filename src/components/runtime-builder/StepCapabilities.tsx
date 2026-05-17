import { useMemo, useState } from "react";
import { Loader2, Search, AlertCircle, Check, Plus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import {
  buildCapabilityIndex,
  CAPABILITY_CATEGORIES,
  groupByCategory,
  type CapabilityCategory,
  type CapabilityEntry,
} from "@/lib/runtime-builder/feature-catalog";

const ALL = "__all__";

export function StepCapabilities() {
  const { state, toggleCapability } = useRuntimeBuilder();
  const { data: catalog, isLoading, error } = useCatalogQuery();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [onlySelected, setOnlySelected] = useState(false);

  const capabilities = useMemo(
    () => (catalog ? buildCapabilityIndex(catalog) : []),
    [catalog],
  );

  const categoryCounts = useMemo(() => {
    const grouped = groupByCategory(capabilities);
    return Array.from(grouped.entries()).map(
      ([cat, list]) => [cat, list.length] as const,
    );
  }, [capabilities]);

  const selectedKey = useMemo(() => {
    const set = new Set<string>();
    for (const sp of state.selectedPackages) {
      for (const f of sp.selectedFeatures) set.add(`${sp.packageId}::${f}`);
    }
    return set;
  }, [state.selectedPackages]);

  const userSelectedKey = useMemo(() => {
    const set = new Set<string>();
    for (const sp of state.selectedPackages) {
      const auto = new Set(sp.autoFeatures ?? []);
      for (const f of sp.selectedFeatures) {
        if (!auto.has(f)) set.add(`${sp.packageId}::${f}`);
      }
    }
    return set;
  }, [state.selectedPackages]);

  const visible = useMemo(() => {
    const term = filter.toLowerCase().trim();
    return capabilities.filter((c) => {
      if (category !== ALL && c.category !== category) return false;
      if (onlySelected && !selectedKey.has(c.key)) return false;
      if (term && !c.haystack.includes(term)) return false;
      return true;
    });
  }, [capabilities, filter, category, onlySelected, selectedKey]);

  const grouped = useMemo(() => groupByCategory(visible), [visible]);
  const totalSelected = userSelectedKey.size;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          What should your runtime do?
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick the capabilities you need. We'll figure out which packages to
          install — and pull in their dependencies — automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn't reach the catalog API.</p>
            <p className="text-xs opacity-80">{(error as Error).message}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Category sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-lg border border-border/60 bg-card/30 p-2">
            <CategoryButton
              label="All capabilities"
              count={capabilities.length}
              active={category === ALL}
              onClick={() => setCategory(ALL)}
            />
            <div className="my-1 h-px bg-border/60" />
            <div className="max-h-[calc(100vh-12rem)] space-y-0.5 overflow-y-auto pr-1">
              {CAPABILITY_CATEGORIES.map((cat) => {
                const count = categoryCounts.find(([c]) => c === cat)?.[1] ?? 0;
                if (count === 0) return null;
                return (
                  <CategoryButton
                    key={cat}
                    label={cat}
                    count={count}
                    active={category === cat}
                    onClick={() => setCategory(cat)}
                  />
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-2 backdrop-blur-md md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search capabilities…"
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant={onlySelected ? "default" : "ghost"}
              onClick={() => setOnlySelected((v) => !v)}
              disabled={totalSelected === 0}
              className={cn(
                "h-7 rounded-full px-3 text-xs",
                !onlySelected && "text-muted-foreground hover:text-foreground",
              )}
            >
              Selected{" "}
              {totalSelected > 0 && (
                <span className="ml-1 opacity-70">{totalSelected}</span>
              )}
            </Button>
          </div>

          {/* Packages-to-install summary */}
          {catalog && state.selectedPackages.length > 0 && (
            <PackagesToInstall />
          )}

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-8 text-center text-sm text-muted-foreground">
              {capabilities.length === 0
                ? "The catalog is empty — capabilities will appear here as packages are published."
                : "No capabilities match your filters."}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([cat, list]) => (
                <section key={cat} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold tracking-tight">
                      {cat}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {list.length} {list.length === 1 ? "capability" : "capabilities"}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                    {list.map((entry) => (
                      <CapabilityCard
                        key={entry.key}
                        entry={entry}
                        selected={selectedKey.has(entry.key)}
                        userSelected={userSelectedKey.has(entry.key)}
                        onToggle={() =>
                          catalog &&
                          toggleCapability(
                            entry.package.id,
                            entry.feature.id,
                            catalog,
                          )
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "shrink-0 font-mono text-[10px]",
          active ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CapabilityCard({
  entry,
  selected,
  userSelected,
  onToggle,
}: {
  entry: CapabilityEntry;
  selected: boolean;
  userSelected: boolean;
  onToggle: () => void;
}) {
  const auto = selected && !userSelected;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition",
        selected
          ? auto
            ? "border-amber-400/40 bg-amber-400/5"
            : "border-primary/50 bg-primary/5"
          : "border-border/60 hover:border-border hover:bg-muted/20",
      )}
    >
      <div className="flex w-full items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
            selected
              ? auto
                ? "bg-amber-400/80 text-background"
                : "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground",
          )}
        >
          {selected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">
              {entry.feature.displayName}
            </span>
            {auto && (
              <Badge
                variant="outline"
                className="shrink-0 border-amber-400/30 text-[9px] uppercase tracking-wide text-amber-400"
              >
                Auto
              </Badge>
            )}
          </div>
          {entry.feature.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {entry.feature.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 pl-7">
        <Badge
          variant="outline"
          className="border-border/50 text-[10px] text-muted-foreground"
        >
          {entry.category}
        </Badge>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-1 truncate font-mono text-[10px] text-muted-foreground/80">
                <Package className="h-3 w-3 shrink-0" />
                <span className="truncate">{entry.package.id}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <div className="font-semibold">{entry.package.displayName}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {entry.package.id} · {entry.package.version}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </button>
  );
}

function PackagesToInstall() {
  const { state } = useRuntimeBuilder();
  const { data: catalog } = useCatalogQuery();
  if (!catalog) return null;

  // Build reason strings: for user-selected features → "Provides {feature}";
  // for autoAdded packages → "Required by {pkg}".
  const rows = state.selectedPackages.map((sp) => {
    const pkg = catalog.packages.find((p) => p.id === sp.packageId);
    const displayName = pkg?.displayName ?? sp.packageId;
    const autoSet = new Set(sp.autoFeatures ?? []);
    const userFeatures = sp.selectedFeatures.filter((f) => !autoSet.has(f));
    let reason: string;
    if (sp.autoAdded) {
      // Find who depends on this package.
      const dependents: string[] = [];
      for (const other of state.selectedPackages) {
        if (other.packageId === sp.packageId) continue;
        const otherPkg = catalog.packages.find(
          (p) => p.id === other.packageId,
        );
        if (!otherPkg) continue;
        for (const f of otherPkg.features) {
          if (!other.selectedFeatures.includes(f.id)) continue;
          const deps = f.dependencies ?? [];
          if (
            deps.some(
              (d) =>
                (d.packageId && d.packageId === sp.packageId) ||
                sp.selectedFeatures.includes(d.featureId),
            )
          ) {
            dependents.push(f.displayName);
          }
        }
      }
      reason =
        dependents.length > 0
          ? `Required by ${dependents.slice(0, 2).join(", ")}${dependents.length > 2 ? ` +${dependents.length - 2}` : ""}`
          : "Required by another capability";
    } else if (userFeatures.length > 0) {
      const labels = userFeatures
        .map((fid) => pkg?.features.find((f) => f.id === fid)?.displayName ?? fid)
        .slice(0, 2);
      reason = `Provides ${labels.join(", ")}${userFeatures.length > 2 ? ` +${userFeatures.length - 2}` : ""}`;
    } else {
      reason = "Selected";
    }
    return {
      id: sp.packageId,
      displayName,
      version: sp.version,
      autoAdded: sp.autoAdded === true,
      reason,
    };
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Packages to install
          </h4>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs">{r.id}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {r.version}
                </span>
                {r.autoAdded && (
                  <Badge
                    variant="outline"
                    className="border-amber-400/30 text-[9px] uppercase tracking-wide text-amber-400"
                  >
                    Auto
                  </Badge>
                )}
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {r.reason}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
