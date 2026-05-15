import { useMemo, useState } from "react";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { findCapability, findSchema } from "@/lib/runtime-builder/catalog-utils";
import { validateBuild } from "@/lib/runtime-builder/validate";
import { SchemaField } from "./SchemaField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ChevronRight, Settings2 } from "lucide-react";

export function StepConfigure() {
  const { catalog, state, setSetting } = useRuntimeBuilder();
  const validation = useMemo(() => validateBuild(state, catalog), [state, catalog]);

  const enabledCaps = state.capabilityIds
    .map((id) => findCapability(catalog, id))
    .filter(Boolean) as NonNullable<ReturnType<typeof findCapability>>[];

  const features = enabledCaps.flatMap((cap) =>
    cap.features.map((feature) => ({
      capability: cap,
      feature,
      schema: findSchema(catalog, feature.id),
    })),
  );

  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(
    features[0]?.feature.id ?? null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const errorByFeature = useMemo(() => {
    const map: Record<string, number> = {};
    for (const finding of validation.errors) {
      if (finding.scope?.kind === "feature") {
        map[finding.scope.featureId] = (map[finding.scope.featureId] ?? 0) + 1;
      }
    }
    return map;
  }, [validation.errors]);

  if (features.length === 0) {
    return (
      <EmptyState message="Enable at least one capability to configure features." />
    );
  }

  const active =
    features.find((f) => f.feature.id === activeFeatureId) ?? features[0];
  const activeValues = state.settings[active.feature.id] ?? {};
  const activeSchema = active.schema;

  const visibleSettings = activeSchema?.settings.filter(
    (s) => showAdvanced || !s.advanced,
  );
  const advancedCount =
    activeSchema?.settings.filter((s) => s.advanced).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Configure features
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Smart defaults are pre-filled. Mark sensitive values as secrets to
          have them written as environment variable references.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="rounded-2xl border border-border/60 bg-card/40 p-2">
          {features.map(({ capability, feature }) => {
            const isActive = feature.id === active.feature.id;
            const errorCount = errorByFeature[feature.id] ?? 0;
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => setActiveFeatureId(feature.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {feature.displayName}
                  </span>
                  <span className="block truncate text-[10px] uppercase tracking-wider opacity-70">
                    {capability.displayName}
                  </span>
                </span>
                {errorCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {errorCount}
                  </span>
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/80" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {active.feature.displayName}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active.capability.description}
              </p>
              {state.advancedMode && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {active.feature.packageId} ·{" "}
                  {state.overrides[active.feature.packageId] ??
                    active.feature.packageVersion}
                </p>
              )}
            </div>
            <Badge variant="outline" className="border-border/50">
              {active.capability.category}
            </Badge>
          </div>

          {!activeSchema || activeSchema.settings.length === 0 ? (
            <p className="rounded-md border border-border/40 bg-background/40 p-4 text-sm text-muted-foreground">
              This feature has no settings to configure.
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {visibleSettings?.map((setting) => (
                  <div
                    key={setting.name}
                    className={cn(setting.type === "boolean" && "flex flex-col gap-2")}
                  >
                    <SchemaField
                      setting={setting}
                      value={activeValues[setting.name]}
                      onChange={(value) =>
                        setSetting(active.feature.id, setting.name, value)
                      }
                    />
                  </div>
                ))}
              </div>

              {advancedCount > 0 && (
                <div className="mt-5 border-t border-border/40 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="text-xs text-muted-foreground"
                  >
                    <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                    {showAdvanced ? "Hide" : "Show"} {advancedCount} advanced
                    setting{advancedCount === 1 ? "" : "s"}
                    <ChevronRight
                      className={cn(
                        "ml-1 h-3 w-3 transition",
                        showAdvanced && "rotate-90",
                      )}
                    />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
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
