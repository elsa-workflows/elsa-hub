import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { useCatalogQuery } from "@/lib/runtime-builder/catalog-client";
import {
  autoFillInfrastructure,
  deriveInfrastructureRequirements,
} from "@/lib/runtime-builder/requirements";
import { InfrastructurePicker } from "./InfrastructurePicker";

export function StepInfrastructure() {
  const {
    state,
    setInfrastructure,
    setInfrastructureSetting,
    upsertInfrastructure,
  } = useRuntimeBuilder();
  const { data: catalog, isLoading } = useCatalogQuery();

  // Auto-fill infrastructure selections when requirements appear or change.
  useEffect(() => {
    if (!catalog) return;
    const desired = autoFillInfrastructure(state, catalog);
    const same =
      desired.length === state.infrastructureSelections.length &&
      desired.every((d, i) => {
        const e = state.infrastructureSelections[i];
        return (
          e?.kind === d.kind &&
          e?.providerId === d.providerId &&
          e?.strategy === d.strategy
        );
      });
    if (same) return;
    for (const sel of desired) upsertInfrastructure(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, state.selectedPackages]);

  const requirements = useMemo(
    () =>
      catalog
        ? deriveInfrastructureRequirements(state.selectedPackages, catalog)
        : [],
    [catalog, state.selectedPackages],
  );

  if (isLoading || !catalog) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Infrastructure
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          For every requirement, pick a provider and how it will be deployed:
          as a Compose sidecar for local development, an external service you
          provide, or a managed offering.
        </p>
      </div>

      {requirements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-10 text-center text-sm text-muted-foreground">
          No infrastructure required by the current selection.
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((req) => {
            const selection = state.infrastructureSelections.find(
              (s) => s.kind === req.kind,
            );
            return (
              <InfrastructurePicker
                key={req.kind}
                catalog={catalog}
                requirement={req}
                selection={selection}
                onProviderChange={(providerId, strategy) =>
                  setInfrastructure(req.kind, providerId, strategy)
                }
                onSettingChange={(name, value) =>
                  setInfrastructureSetting(req.kind, name, value)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
