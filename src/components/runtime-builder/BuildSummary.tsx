import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Info,
  Package,
  Server,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import { findCapability, findImage } from "@/lib/runtime-builder/catalog-utils";
import { validateBuild } from "@/lib/runtime-builder/validate";
import { cn } from "@/lib/utils";

interface Props {
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export function BuildSummary({ onOpenImport, onOpenExport }: Props) {
  const { catalog, state } = useRuntimeBuilder();
  const image = findImage(catalog, state.imageId);
  const validation = useMemo(() => validateBuild(state, catalog), [state, catalog]);

  const capabilityNames = state.capabilityIds
    .map((id) => findCapability(catalog, id)?.displayName)
    .filter(Boolean) as string[];

  const featureCount = state.capabilityIds.reduce((acc, id) => {
    const cap = findCapability(catalog, id);
    return acc + (cap?.features.length ?? 0);
  }, 0);

  const sizeMb = image
    ? image.estimatedSizeMb + state.capabilityIds.length * 8
    : 0;

  return (
    <aside className="sticky top-24 flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Build summary
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold">Your runtime</h3>
      </div>

      <SummaryRow icon={Server} label="Image">
        {image ? (
          <span className="flex items-center gap-2">
            <span className="font-medium">{image.displayName}</span>
            <code className="font-mono text-[11px] text-muted-foreground">
              {state.imageVersion ?? image.versions[0]}
            </code>
          </span>
        ) : (
          <span className="text-muted-foreground">Not selected</span>
        )}
      </SummaryRow>

      <SummaryRow icon={Sparkles} label="Capabilities">
        <span>
          {capabilityNames.length === 0 ? (
            <span className="text-muted-foreground">None enabled</span>
          ) : (
            <span className="text-foreground">
              {capabilityNames.length} enabled · {featureCount} feature
              {featureCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </SummaryRow>

      <SummaryRow icon={Package} label="License">
        {image ? (
          <Badge variant="outline" className="border-primary/40 text-primary">
            {image.licenseTier}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </SummaryRow>

      <SummaryRow icon={Database} label="Estimated size">
        <span className="text-foreground">~ {sizeMb} MB</span>
      </SummaryRow>

      <Separator />

      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Validation
        </p>
        <ValidationPill validation={validation} />
        <ul className="mt-3 space-y-1 text-xs">
          <li className="flex items-center gap-2 text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            {validation.errors.length} error{validation.errors.length === 1 ? "" : "s"}
          </li>
          <li className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {validation.warnings.length} warning
            {validation.warnings.length === 1 ? "" : "s"}
          </li>
          <li className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {validation.passes.length} passed
          </li>
        </ul>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onOpenImport}>
          Import
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenExport}>
          Export
        </Button>
      </div>

      <Button
        size="sm"
        className="w-full"
        disabled={!validation.isValid || !image}
        asChild={validation.isValid && !!image}
      >
        {validation.isValid && image ? (
          <Link to="?step=5">
            <Download className="mr-2 h-4 w-4" /> Preview bundle
          </Link>
        ) : (
          <span>
            <Download className="mr-2 h-4 w-4" /> Resolve errors first
          </span>
        )}
      </Button>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Bundle download lands next. For now you can copy each file from the
        preview.
      </p>
    </aside>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function ValidationPill({
  validation,
}: {
  validation: ReturnType<typeof validateBuild>;
}) {
  const ready = validation.readiness;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Readiness</span>
        <span
          className={cn(
            "font-semibold",
            ready >= 70 ? "text-emerald-400" : ready >= 30 ? "text-amber-400" : "text-destructive",
          )}
        >
          {ready}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            ready >= 70
              ? "bg-emerald-400/80"
              : ready >= 30
                ? "bg-amber-400/80"
                : "bg-destructive/80",
          )}
          style={{ width: `${ready}%` }}
        />
      </div>
    </div>
  );
}
