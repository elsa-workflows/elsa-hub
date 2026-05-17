import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Info,
  Package,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import {
  useCatalogQuery,
  useResolveQuery,
} from "@/lib/runtime-builder/catalog-client";
import { validateBuildV2 } from "@/lib/runtime-builder/validate";
import { findPackage } from "@/lib/runtime-builder/requirements";
import type { CatalogV2 } from "@/lib/runtime-builder/types-v2";
import { cn } from "@/lib/utils";
import { WeaverIntentLog } from "./WeaverIntentLog";

interface Props {
  onOpenImport: () => void;
  onOpenExport: () => void;
}

const EMPTY_CATALOG: CatalogV2 = { packages: [], infrastructureProviders: [] };

export function BuildSummary({ onOpenImport, onOpenExport }: Props) {
  const { state } = useRuntimeBuilder();
  const { data: catalog } = useCatalogQuery();
  const { data: apiResolve } = useResolveQuery(state, true);

  const validation = useMemo(
    () => validateBuildV2(state, catalog ?? EMPTY_CATALOG, apiResolve),
    [state, catalog, apiResolve],
  );

  const packageNames = state.selectedPackages
    .map((p) => findPackage(catalog ?? EMPTY_CATALOG, p.packageId)?.displayName)
    .filter(Boolean) as string[];

  const featureCount = state.selectedPackages.reduce(
    (acc, p) => acc + p.selectedFeatures.length,
    0,
  );

  return (
    <aside className="sticky top-24 flex flex-col gap-5 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Build summary
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold">Your runtime</h3>
      </div>

      <SummaryRow icon={Package} label="Packages">
        {packageNames.length === 0 ? (
          <span className="text-muted-foreground">None selected</span>
        ) : (
          <span className="text-foreground">
            {packageNames.length} · {featureCount} feature
            {featureCount === 1 ? "" : "s"}
          </span>
        )}
      </SummaryRow>

      <SummaryRow icon={Database} label="Infrastructure">
        <span className="text-foreground">
          {state.infrastructureSelections.length === 0
            ? "—"
            : `${state.infrastructureSelections.length} selection${state.infrastructureSelections.length === 1 ? "" : "s"}`}
        </span>
      </SummaryRow>

      <SummaryRow icon={Sparkles} label="Sources">
        <span className="text-foreground">
          {state.packageSources.filter((s) => s.enabled).length} active
        </span>
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
        disabled={!validation.isValid || state.selectedPackages.length === 0}
        asChild={validation.isValid && state.selectedPackages.length > 0}
      >
        {validation.isValid && state.selectedPackages.length > 0 ? (
          <Link to={state.advancedMode ? "?step=7" : "?step=5"}>
            <Download className="mr-2 h-4 w-4" /> Preview bundle
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center">
            <AlertTriangle className="mr-2 h-4 w-4" /> Resolve errors first
          </span>
        )}
      </Button>

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Bundle download lands next. For now you can copy each file from the
        preview.
      </p>

      <WeaverIntentLog />
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
  validation: ReturnType<typeof validateBuildV2>;
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
