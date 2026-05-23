import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ArrowUpRight,
  Workflow,
  Layers,
  GitBranch as PipelineIcon,
  Map as MapIcon,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Card, CardContent } from "@/components/ui/card";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";
import { PlatformShell, takeaways } from "./platform/shared";

const sectionCards = [
  {
    to: "/elsa-plus/platform/deployment-loop",
    icon: Workflow,
    label: "Deployment loop",
    body: "The six-step loop at the heart of the platform — deterministic and idempotent by design.",
  },
  {
    to: "/elsa-plus/platform/surfaces",
    icon: Layers,
    label: "Surfaces",
    body: "Eight platform surfaces, from package catalog and runtime builder to audit and AI assistants.",
  },
  {
    to: "/elsa-plus/platform/pipeline",
    icon: PipelineIcon,
    label: "Pipeline",
    body: "The seven-step deployment pipeline: manifest → artifact → validate → plan → preview → apply → record.",
  },
  {
    to: "/elsa-plus/platform/roadmap",
    icon: MapIcon,
    label: "Roadmap",
    body: "Three phases — Foundation, Enterprise, and Platform Engineering — built additively with stable contracts.",
  },
];

export default function ElsaPlatform() {
  return (
    <PlatformShell
      pageTitle="Overview"
      seo={
        <Seo
          path="/elsa-plus/platform"
          title="Elsa Platform — Control plane for Elsa Workflows"
          description="Design, package, validate, deploy, and operate Elsa-based workflow systems across environments with a declarative, auditable control plane."
        />
      }
    >
      {/* Hero */}
      <header className="mb-10">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          control plane · v1alpha · in development
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl font-bold leading-tight tracking-tight">
          Elsa <span className="text-primary">Platform</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Design, package, validate, deploy, and operate Elsa-based workflow systems across
          environments — and run AI assistants on workflows you can audit and govern.
        </p>
      </header>

      {/* Why */}
      <section className="mb-12">
        <div className="mb-6 max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Why it exists
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Workflows and runtime config need{" "}
            <span className="text-primary">reproducible, auditable</span> deployment.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: AlertTriangle,
              tone: "text-destructive",
              label: "Problem",
              body: "Workflow definitions, variables, features, and packages are deployed inconsistently across environments — without diffs, dry-runs, or a durable record of what changed.",
            },
            {
              icon: CheckCircle2,
              tone: "text-primary",
              label: "Promise",
              body: "One versioned manifest. Validated, planned, previewed, applied idempotently. Safe to re-run. Every release recorded. CI/CD-friendly from day one.",
            },
            {
              icon: GitBranch,
              tone: "text-accent-foreground",
              label: "Boundary",
              body: "Deployments manage control-plane state. They do not move running instances, execution logs, queues, bookmarks, or other runtime data.",
            },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} variant="glass">
                <CardContent className="p-6">
                  <div className={`flex items-center gap-2 ${c.tone}`}>
                    <Icon className="h-4 w-4" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                      {c.label}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">{c.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section nav cards */}
      <section className="mb-12">
        <div className="mb-6 max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Explore
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dive into each part of the platform.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Each section has its own page. Use the sidebar to jump between them.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sectionCards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {c.label}
                      </div>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                        {c.body}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Takeaway */}
      <section className="mb-12">
        <div className="mb-6 max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary mb-2">
            Executive takeaway
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            From workflow design to governed deployment.
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {takeaways.map((it) => {
            const Icon = it.icon;
            return (
              <Card key={it.title} variant="glass" className="h-full">
                <CardContent className="p-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="mt-3 text-[14.5px] font-semibold">{it.title}</div>
                  <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                    {it.body}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            to="/elsa-plus"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Back to Elsa+ <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <ElsaPlusDisclaimer />
    </PlatformShell>
  );
}
