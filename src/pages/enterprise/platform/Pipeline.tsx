import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";
import { PlatformShell, PipelineDiagram, pipeline } from "./shared";

export default function Pipeline() {
  return (
    <PlatformShell
      pageTitle="Pipeline"
      seo={
        <Seo
          path="/elsa-plus/platform/pipeline"
          title="Pipeline — Elsa Platform"
          description="The seven-step Elsa Platform deployment pipeline: author manifest, build artifact, validate, plan, preview, apply, and record."
        />
      }
    >
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Deployment deep dive
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          From manifest to history, in a single deterministic pipeline.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground text-lg">
          Every release flows through the same seven-step pipeline. Plans are deterministic. Applies
          are idempotent. Re-running the same artifact is always safe.
        </p>
      </header>

      <PipelineDiagram />

      <Card variant="glass">
        <CardContent className="p-6 md:p-8">
          <div className="hidden lg:flex items-stretch gap-2">
            {pipeline.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="flex flex-1 items-stretch">
                  <div
                    id={`pipeline-step-${s.id}`}
                    className="flex flex-1 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 scroll-mt-24 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold">{s.title}</div>
                      <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                        {s.body}
                      </div>
                    </div>
                  </div>
                  {i < pipeline.length - 1 && (
                    <ChevronRight className="mx-1 mt-7 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          <ol className="space-y-3 lg:hidden">
            {pipeline.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.title}
                  id={`pipeline-step-${s.id}`}
                  className="flex gap-4 rounded-lg border border-border bg-muted/30 p-4 scroll-mt-24 transition-all"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[15px] font-semibold">{s.title}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Deployments manage
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/85">
              Workflow definitions, variables, packages, features, recipes, schedules, permissions,
              and secret references — versioned and reproducible across environments.
            </p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Deployments do not touch
            </div>
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              Running workflow instances, execution logs, queues, bookmarks, or other transient
              runtime data. Elsa Platform does not replace Terraform or secret managers, and does
              not migrate live runtime state.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <ElsaPlusDisclaimer />
      </div>
    </PlatformShell>
  );
}
