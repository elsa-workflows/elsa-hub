import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database } from "lucide-react";
import { useControlCatalog } from "@/lib/runtime-builder/control-api";
import {
  findImage,
  flattenFeatures,
  requiredInfrastructure,
  useConfigurator,
} from "@/lib/runtime-builder/configurator-store";

export function StepInfrastructure() {
  const { data: catalog } = useControlCatalog();
  const { state, setInfrastructure } = useConfigurator();

  const image = findImage(catalog, state.imageSlug);
  const features = useMemo(() => flattenFeatures(catalog, image), [catalog, image]);
  const selected = features.filter((f) => state.features[f.featureId]);
  const requirements = useMemo(() => requiredInfrastructure(selected), [selected]);
  const providers = catalog?.infrastructureProviders ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Infrastructure
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your feature selection implies the backing services below. Pick how each one is
          provisioned — sidecar containers are generated into the deployment bundle.
        </p>
      </header>

      {!requirements.length ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          The features you selected need no external infrastructure.
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((req) => {
            const candidates = providers.filter(
              (p) =>
                p.kind === req.kind &&
                (!req.providers.length ||
                  req.providers.some(
                    (name) => name.toLowerCase() === p.provider.toLowerCase(),
                  )),
            );
            const options = candidates.length
              ? candidates
              : providers.filter((p) => p.kind === req.kind);
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-border/60 bg-card/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{req.id}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {req.kind}
                      </Badge>
                      {req.optional && (
                        <Badge variant="secondary" className="text-[10px]">
                          optional
                        </Badge>
                      )}
                    </div>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground">{req.reason}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70">
                      Required by {req.requiredBy.join(", ")}
                    </p>
                  </div>

                  <div className="w-full max-w-xs space-y-1.5">
                    <Label className="text-xs">Provider</Label>
                    <Select
                      value={state.infrastructure[req.id] ?? ""}
                      onValueChange={(v) => setInfrastructure(req.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.displayName} · {p.strategy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!options.length && (
                      <p className="text-[11px] text-destructive">
                        No provider available for this requirement.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
