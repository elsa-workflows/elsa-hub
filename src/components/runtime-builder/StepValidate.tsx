import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRuntimeBuilder } from "@/lib/runtime-builder/store";
import {
  useCatalogQuery,
  useResolveQuery,
} from "@/lib/runtime-builder/catalog-client";
import { validateBuildV2 } from "@/lib/runtime-builder/validate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { CatalogV2, ResolveFinding } from "@/lib/runtime-builder/types-v2";

const EMPTY_CATALOG: CatalogV2 = { packages: [], infrastructureProviders: [] };

export function StepValidate() {
  const { state } = useRuntimeBuilder();
  const navigate = useNavigate();
  const [, setSearch] = useSearchParams();
  const { data: catalog } = useCatalogQuery();
  const { data: apiResolve, isFetching } = useResolveQuery(state, true);

  const validation = useMemo(
    () => validateBuildV2(state, catalog ?? EMPTY_CATALOG, apiResolve),
    [state, catalog, apiResolve],
  );

  function jumpTo(finding: ResolveFinding) {
    if (!finding.scope) return;
    if (finding.scope.kind === "package") setSearch({ step: "2" });
    else if (finding.scope.kind === "feature") setSearch({ step: "5" });
    else if (finding.scope.kind === "infrastructure") setSearch({ step: "4" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Validate & review
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Resolve errors before previewing the bundle. Warnings are
            recommendations — they won't block download.
            {isFetching && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking with catalog API…
              </span>
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 px-5 py-4 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Deployment readiness
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span
              className={cn(
                "font-display text-3xl font-semibold",
                validation.readiness >= 70
                  ? "text-emerald-400"
                  : validation.readiness >= 30
                    ? "text-amber-400"
                    : "text-destructive",
              )}
            >
              {validation.readiness}%
            </span>
            <Badge
              variant="outline"
              className={cn(
                "border-border/50",
                validation.isValid && "border-emerald-500/40 text-emerald-300",
                !validation.isValid && "border-destructive/40 text-destructive",
              )}
            >
              {validation.isValid ? "Ready to ship" : "Action required"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {state.selectedPackages.length} packages ·{" "}
            {state.infrastructureSelections.length} infra selections
          </p>
        </div>
      </div>

      <FindingGroup
        title="Errors"
        icon={XCircle}
        tone="destructive"
        findings={validation.errors}
        emptyText="No blocking errors. Nice."
        onJump={jumpTo}
      />
      <FindingGroup
        title="Warnings"
        icon={AlertTriangle}
        tone="warning"
        findings={validation.warnings}
        emptyText="No warnings. Production-ready hygiene."
        onJump={jumpTo}
      />
      <FindingGroup
        title="Passed checks"
        icon={CheckCircle2}
        tone="success"
        findings={validation.passes}
        emptyText="No passing checks yet."
        onJump={jumpTo}
      />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("?step=5")}>
          Back to configure
        </Button>
        <Button
          disabled={!validation.isValid}
          onClick={() => navigate("?step=7")}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Preview bundle
        </Button>
      </div>
    </div>
  );
}

function FindingGroup({
  title,
  icon: Icon,
  tone,
  findings,
  emptyText,
  onJump,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "destructive" | "warning" | "success";
  findings: ResolveFinding[];
  emptyText: string;
  onJump: (finding: ResolveFinding) => void;
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive border-destructive/30"
      : tone === "warning"
        ? "text-amber-300 border-amber-500/30"
        : "text-emerald-300 border-emerald-500/30";

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <div className={cn("flex items-center gap-2 text-sm font-semibold", toneClass)}>
          <Icon className="h-4 w-4" /> {title}
          <span className="text-xs text-muted-foreground">({findings.length})</span>
        </div>
      </header>
      <div className="divide-y divide-border/40">
        {findings.length === 0 ? (
          <p className="px-5 py-4 text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          findings.map((finding, i) => (
            <div
              key={`${finding.code}-${i}`}
              className="flex items-start justify-between gap-3 px-5 py-3 text-sm"
            >
              <div>
                <p>{finding.message}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {finding.code}
                </p>
              </div>
              {finding.scope && finding.scope.kind !== "global" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => onJump(finding)}
                >
                  Fix it →
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
