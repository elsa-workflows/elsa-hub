import { useMemo, useState } from "react";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { findCapability, findImage } from "@/lib/runtime-builder/catalog-utils";
import type { Capability, CapabilityCategory } from "@/lib/runtime-builder/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const ALL_CATEGORIES: (CapabilityCategory | "All")[] = [
  "All",
  "Persistence",
  "Messaging",
  "AI",
  "Observability",
  "Authentication",
  "Scheduling",
  "Storage",
  "Runtime Extensions",
  "Integrations",
];

export function StepCapabilities() {
  const { catalog, state, setCapabilityEnabled } = useRuntimeBuilder();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof ALL_CATEGORIES)[number]>("All");

  const image = findImage(catalog, state.imageId);

  const filtered = useMemo(() => {
    return catalog.capabilities.filter((cap) => {
      if (category !== "All" && cap.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = [
          cap.displayName,
          cap.description,
          cap.category,
          ...(cap.tags ?? []),
          ...cap.features.map((f) => f.packageId),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [catalog.capabilities, category, query]);

  if (!image) {
    return (
      <EmptyState message="Select a runtime image first to browse compatible capabilities." />
    );
  }

  function handleToggle(cap: Capability, next: boolean) {
    const result = setCapabilityEnabled(cap.id, next);
    if (result.blocked) {
      const blockedCap = findCapability(catalog, result.blocked);
      toast({
        title: "Conflict prevented",
        description: `Disable ${blockedCap?.displayName ?? result.blocked} first.`,
        variant: "destructive",
      });
      return;
    }
    if (next && result.added.length > 0) {
      const names = result.added
        .map((id) => findCapability(catalog, id)?.displayName)
        .filter(Boolean)
        .join(", ");
      if (names) {
        toast({
          title: "Dependencies enabled",
          description: `Also enabled: ${names}`,
        });
      }
    }
    if (!next && result.removed.length > 0) {
      const names = result.removed
        .map((id) => findCapability(catalog, id)?.displayName)
        .filter(Boolean)
        .join(", ");
      if (names) {
        toast({
          title: "Dependents disabled",
          description: `Also disabled: ${names}`,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Choose capabilities
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Capabilities map to one or more underlying packages. We auto-resolve
          dependencies and prevent conflicting combinations.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search capabilities or packages…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                category === cat
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((cap) => {
          const enabled = state.capabilityIds.includes(cap.id);
          const supported = image.capabilities.includes(cap.id);
          const conflictsActive = (cap.conflicts ?? []).filter((id) =>
            state.capabilityIds.includes(id),
          );

          return (
            <div
              key={cap.id}
              className={cn(
                "group flex flex-col gap-3 rounded-2xl border bg-card/40 p-4 backdrop-blur-xl transition",
                enabled
                  ? "border-primary/50 bg-primary/[0.04]"
                  : "border-border/60",
                !supported && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-display text-sm font-semibold">
                      {cap.displayName}
                    </h3>
                    {cap.recommended && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-300 px-1.5 py-0 text-[9px]"
                      >
                        <Sparkles className="mr-1 h-2.5 w-2.5" /> Recommended
                      </Badge>
                    )}
                    {cap.advanced && (
                      <Badge
                        variant="outline"
                        className="border-border/50 px-1.5 py-0 text-[9px] text-muted-foreground"
                      >
                        <Zap className="mr-1 h-2.5 w-2.5" /> Advanced
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {cap.category}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={!supported}
                  onCheckedChange={(value) => handleToggle(cap, value)}
                />
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {cap.description}
              </p>

              {!supported && (
                <p className="flex items-start gap-1.5 rounded-md border border-border/50 bg-background/50 p-2 text-[11px] text-muted-foreground">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  Not supported by {image.displayName}. Switch to a Pro or AI
                  runtime image to enable.
                </p>
              )}

              {conflictsActive.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  Conflicts with{" "}
                  {conflictsActive
                    .map((id) => findCapability(catalog, id)?.displayName)
                    .filter(Boolean)
                    .join(", ")}
                  .
                </p>
              )}

              {state.advancedMode && (
                <div className="rounded-md border border-border/40 bg-background/40 p-2 text-[10px] text-muted-foreground">
                  <p className="mb-1 flex items-center gap-1 uppercase tracking-wider">
                    <ShieldCheck className="h-2.5 w-2.5" /> Packages
                  </p>
                  <ul className="space-y-0.5 font-mono">
                    {cap.features.map((feature) => (
                      <li key={feature.id} className="flex justify-between gap-2">
                        <span className="truncate">{feature.packageId}</span>
                        <span>{feature.packageVersion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState message="No capabilities match those filters." />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
