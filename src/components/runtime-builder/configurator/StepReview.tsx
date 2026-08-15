import { useMemo, useState } from "react";
import JSZip from "jszip";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  generateBundle,
  planBuild,
  useControlCatalog,
  type PlanFinding,
} from "@/lib/runtime-builder/control-api";
import { buildIntent, useConfigurator } from "@/lib/runtime-builder/configurator-store";

export function StepReview() {
  const { data: catalog } = useControlCatalog();
  const { state } = useConfigurator();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const intent = useMemo(() => buildIntent(state, catalog), [state, catalog]);

  const plan = useQuery({
    queryKey: ["valence-control", "plan", intent],
    queryFn: () => planBuild(intent!),
    enabled: Boolean(intent),
    staleTime: 30_000,
  });

  const findings = plan.data?.findings ?? [];
  const errors = findings.filter((f) => f.level === "error");
  const warnings = findings.filter((f) => f.level === "warning");
  const autoAdded = plan.data?.autoAdded;

  function timestamp() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  async function download() {
    if (!intent || downloading) return;
    const resolved = plan.data?.resolved;
    if (!resolved) return;
    setDownloading(true);
    try {
      const result = await generateBundle(resolved);
      const name = `elsa-deployment-${timestamp()}.zip`;
      let blob: Blob;
      if (result.binary) {
        const bytes = Uint8Array.from(atob(result.binary.base64), (c) => c.charCodeAt(0));
        blob = new Blob([bytes], { type: result.binary.contentType });
      } else {
        const zip = new JSZip();
        for (const f of result.files) zip.file(f.path, f.contents);
        zip.file("build.json", JSON.stringify(resolved, null, 2));
        blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.binary?.fileName ?? name;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Downloaded ${a.download}` });
    } catch (err) {
      console.error("[runtime-builder] bundle generation failed", err);
      toast({
        title: "Bundle generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Review</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Your configuration is validated by the Valence Control planner. Download the
            deployment bundle once it comes back clean.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button onClick={download} disabled={!intent || downloading || errors.length > 0}>
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download bundle
              </>
            )}
          </Button>
          {errors.length > 0 && (
            <p className="text-[11px] text-destructive">
              Resolve {errors.length} error{errors.length === 1 ? "" : "s"} first.
            </p>
          )}
        </div>
      </header>

      {plan.isLoading && <Skeleton className="h-24 rounded-2xl" />}

      {plan.isError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Validation unavailable</AlertTitle>
          <AlertDescription>
            {plan.error instanceof Error ? plan.error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {plan.isSuccess && !findings.length && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Configuration is valid</AlertTitle>
          <AlertDescription>
            The planner found no issues with your selection.
          </AlertDescription>
        </Alert>
      )}

      {findings.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Findings · {errors.length} error{errors.length === 1 ? "" : "s"},{" "}
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </h3>
          {findings.map((f, i) => (
            <FindingRow key={`${f.code}-${i}`} finding={f} />
          ))}
        </section>
      )}

      {(autoAdded?.packages?.length || autoAdded?.features?.length) ? (
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="font-display text-base font-semibold">Automatically added</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The planner pulled in these dependencies for you.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(autoAdded?.features ?? []).map((f) => (
              <Badge key={f} variant="secondary" className="font-mono text-[10px]">
                {f}
              </Badge>
            ))}
            {(autoAdded?.packages ?? []).map((p) => (
              <Badge key={p.packageId} variant="outline" className="font-mono text-[10px]">
                {p.packageId} {p.version}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <header className="border-b border-border/40 px-4 py-2.5">
          <code className="font-mono text-xs">build intent</code>
        </header>
        <pre className="max-h-[45vh] overflow-auto p-4 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(intent, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function FindingRow({ finding }: { finding: PlanFinding }) {
  const Icon =
    finding.level === "error" ? XCircle : finding.level === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        finding.level === "error"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : finding.level === "warning"
            ? "border-amber-500/40 bg-amber-500/5 text-amber-500"
            : "border-border/60 bg-card/40 text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p>{finding.message}</p>
        <p className="font-mono text-[10px] opacity-70">{finding.code}</p>
      </div>
    </div>
  );
}
