import { useMemo, useState } from "react";
import { Loader2, Search, AlertCircle, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import { PackageCard } from "./PackageCard";
import { PackageListRow } from "./PackageListRow";
import type { PackageManifest } from "@/lib/runtime-builder/types-v2";

type Channel = "all" | "oss" | "preview" | "selected";
type ViewMode = "grid" | "list";
type SortKey = "name" | "category" | "version";

const ALL_CATEGORY = "__all__";

export function StepPackages() {
  const { state, togglePackage, setPackageVersion } = useRuntimeBuilder();
  const { data: catalog, isLoading, error } = useCatalogQuery();
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const [channel, setChannel] = useState<Channel>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("name");

  const selectedMap = useMemo(
    () => new Map(state.selectedPackages.map((p) => [p.packageId, p] as const)),
    [state.selectedPackages],
  );

  const allPackages: PackageManifest[] = catalog?.packages ?? [];

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allPackages) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPackages]);

  const visible = useMemo(() => {
    const term = filter.toLowerCase().trim();
    let list = allPackages.filter((p) => {
      if (category !== ALL_CATEGORY && p.category !== category) return false;
      if (channel === "oss" && p.licenseTier !== "OSS") return false;
      if (channel === "preview" && p.stability === "Stable") return false;
      if (channel === "selected" && !selectedMap.has(p.id)) return false;
      if (term) {
        const hay =
          p.displayName.toLowerCase() +
          " " +
          p.id.toLowerCase() +
          " " +
          (p.description?.toLowerCase() ?? "") +
          " " +
          p.category.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "category") return a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName);
      if (sort === "version") return b.version.localeCompare(a.version, undefined, { numeric: true });
      return a.displayName.localeCompare(b.displayName);
    });
    return list;
  }, [allPackages, filter, category, channel, selectedMap, sort]);

  const selectedCount = state.selectedPackages.length;
  const headingLabel = category === ALL_CATEGORY ? "All packages" : category;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Pick packages</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Capabilities are derived from package manifests. Select the packages your runtime needs;
          configure features in the next step.
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
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-lg border border-border/60 bg-card/30 p-2">
            <CategoryButton
              label="All packages"
              count={allPackages.length}
              active={category === ALL_CATEGORY}
              onClick={() => setCategory(ALL_CATEGORY)}
            />
            <div className="my-1 h-px bg-border/60" />
            <div className="max-h-[calc(100vh-12rem)] space-y-0.5 overflow-y-auto pr-1">
              {categoryCounts.map(([cat, count]) => (
                <CategoryButton
                  key={cat}
                  label={cat}
                  count={count}
                  active={category === cat}
                  onClick={() => setCategory(cat)}
                />
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {/* Mobile category select */}
          <div className="lg:hidden">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORY}>All packages ({allPackages.length})</SelectItem>
                {categoryCounts.map(([cat, count]) => (
                  <SelectItem key={cat} value={cat}>
                    {cat} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-lg border border-border/60 bg-background/80 p-2 backdrop-blur-md md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search packages…"
                className="h-8 pl-8 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <ChannelChip active={channel === "all"} onClick={() => setChannel("all")}>
                All
              </ChannelChip>
              <ChannelChip active={channel === "oss"} onClick={() => setChannel("oss")}>
                OSS
              </ChannelChip>
              <ChannelChip active={channel === "preview"} onClick={() => setChannel("preview")}>
                Preview
              </ChannelChip>
              <ChannelChip
                active={channel === "selected"}
                onClick={() => setChannel("selected")}
                disabled={selectedCount === 0}
              >
                Selected {selectedCount > 0 && <span className="ml-1 opacity-70">{selectedCount}</span>}
              </ChannelChip>
            </div>

            <div className="flex items-center gap-1">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name" className="text-xs">Sort: Name</SelectItem>
                  <SelectItem value="category" className="text-xs">Sort: Category</SelectItem>
                  <SelectItem value="version" className="text-xs">Sort: Version</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex overflow-hidden rounded-md border border-border/60">
                <ViewToggleButton active={view === "grid"} onClick={() => setView("grid")} aria-label="Grid view">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </ViewToggleButton>
                <ViewToggleButton active={view === "list"} onClick={() => setView("list")} aria-label="List view">
                  <List className="h-3.5 w-3.5" />
                </ViewToggleButton>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold">{headingLabel}</h3>
            <span className="text-xs text-muted-foreground">
              {visible.length} {visible.length === 1 ? "package" : "packages"}
            </span>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-8 text-center text-sm text-muted-foreground">
              {allPackages.length === 0
                ? "The catalog is empty — package manifests will appear here as they are published."
                : "No packages match your filters."}
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((pkg) => {
                const sel = selectedMap.get(pkg.id);
                return (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={Boolean(sel)}
                    selectedVersion={sel?.version ?? null}
                    autoAdded={sel?.autoAdded === true}
                    onToggle={(v) => togglePackage(pkg.id, v, catalog ?? null)}
                    onVersionChange={(v) => setPackageVersion(pkg.id, v)}
                    hideCategory={category !== ALL_CATEGORY}
                  />
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60 bg-card/30">
              {visible.map((pkg) => {
                const sel = selectedMap.get(pkg.id);
                return (
                  <PackageListRow
                    key={pkg.id}
                    pkg={pkg}
                    selected={Boolean(sel)}
                    selectedVersion={sel?.version ?? null}
                    autoAdded={sel?.autoAdded === true}
                    onToggle={(v) => togglePackage(pkg.id, v, catalog ?? null)}
                    onVersionChange={(v) => setPackageVersion(pkg.id, v)}
                    showCategory={category === ALL_CATEGORY}
                  />
                );
              })}
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
      <span className={cn("shrink-0 font-mono text-[10px]", active ? "text-primary" : "text-muted-foreground/70")}>
        {count}
      </span>
    </button>
  );
}

function ChannelChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-7 rounded-full px-3 text-xs",
        !active && "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function ViewToggleButton({
  active,
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center transition",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
