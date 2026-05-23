import { Card, CardContent } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";
import { PlatformShell, loopSteps } from "./shared";

export default function DeploymentLoop() {
  return (
    <PlatformShell
      pageTitle="Deployment loop"
      seo={
        <Seo
          path="/elsa-plus/platform/deployment-loop"
          title="Deployment loop — Elsa Platform"
          description="The deterministic, idempotent deployment loop at the heart of Elsa Platform: manifest, artifact, validation, dry-run, apply, history."
        />
      }
    >
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Core deployment loop
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          Six steps. Deterministic. Idempotent.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-lg">
          The same loop runs in development, CI, and production. Re-running the same artifact is
          always safe — and every run is recorded.
        </p>
      </header>

      <Card variant="glass">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Loop steps
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              deterministic · idempotent
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {loopSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className="flex flex-col items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:border-primary/50"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[15px] font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["Resource model", "Workflows · Variables · Features · Packages · Recipes"],
          ["Surfaces", "CLI · API · GitOps-ready"],
          ["Separation", "Control plane reconciles desired state; not runtime execution"],
          ["Portable", "Cloud · self-hosted · air-gapped"],
        ].map(([k, v]) => (
          <Card key={k} variant="glass">
            <CardContent className="p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {k}
              </div>
              <div className="mt-2 text-[14.5px] leading-snug">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <ElsaPlusDisclaimer />
      </div>
    </PlatformShell>
  );
}
