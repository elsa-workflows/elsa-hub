import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StrategyBadge } from "./StrategyBadge";
import type {
  CatalogV2,
  InfrastructureSelection,
  Strategy,
} from "@/lib/runtime-builder/types-v2";
import {
  findProvider,
  providersForKind,
} from "@/lib/runtime-builder/requirements";
import type { DerivedRequirement } from "@/lib/runtime-builder/requirements";

interface Props {
  catalog: CatalogV2;
  requirement: DerivedRequirement;
  selection: InfrastructureSelection | undefined;
  onProviderChange: (providerId: string | null, strategy: Strategy) => void;
  onSettingChange: (name: string, value: unknown) => void;
}

export function InfrastructurePicker({
  catalog,
  requirement,
  selection,
  onProviderChange,
  onSettingChange,
}: Props) {
  const candidates = providersForKind(catalog, requirement.kind);
  const currentProvider = findProvider(catalog, selection?.providerId);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {requirement.kind.replace(/-/g, " ")}
          </p>
          <h3 className="mt-1 font-display text-base font-semibold capitalize">
            {prettyKind(requirement.kind)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Required by{" "}
            {requirement.sources.map((s) => s.featureName).join(", ")}.
          </p>
          {requirement.capabilities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {requirement.capabilities.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="border-border/50 text-[10px] text-muted-foreground"
                >
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {selection && <StrategyBadge strategy={selection.strategy} />}
      </header>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <Select
            value={selection?.providerId ?? "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") {
                onProviderChange(null, "none");
                return;
              }
              const provider = candidates.find((p) => p.id === v);
              onProviderChange(v, provider?.strategy ?? "compose-sidecar");
            }}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Pick a provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None — handle outside the bundle</SelectItem>
              {candidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.displayName} · {p.strategy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentProvider &&
          (currentProvider.strategy === "external-service" ||
            currentProvider.strategy === "managed") && (
            <div className="grid gap-3 md:grid-cols-2">
              {currentProvider.outputs.map((output) => (
                <div key={output} className="space-y-1.5">
                  <Label className="text-xs">{output}</Label>
                  <Input
                    value={String(selection?.settings?.[output] ?? "")}
                    onChange={(e) => onSettingChange(output, e.target.value)}
                    placeholder={`Provide ${output}`}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
              {currentProvider.outputs.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">
                  No connection details to configure for this provider.
                </p>
              )}
            </div>
          )}
      </div>
    </section>
  );
}

function prettyKind(kind: string) {
  return kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
