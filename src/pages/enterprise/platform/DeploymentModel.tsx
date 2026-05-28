import {
  PenTool,
  Package,
  ServerCog,
  Layers3,
  Cpu,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";
import { PlatformShell } from "./shared";

const stages = [
  {
    icon: PenTool,
    eyebrow: "01 · Design",
    title: "Design in Elsa Studio",
    body:
      "Users model, configure, and validate workflows in Elsa Studio. When ready, Studio prepares the workflow as a deployable workflow artifact.",
  },
  {
    icon: Package,
    eyebrow: "02 · Submit",
    title: "Submit to Elsa Platform",
    body:
      "Studio submits the deployable workflow artifact to the platform. The deployment intent — target workspace, environment, version, and safe metadata — is recorded.",
  },
  {
    icon: ServerCog,
    eyebrow: "03 · Govern",
    title: "Platform deployment control plane",
    body:
      "The platform validates targets, applies workspace and environment rules, and coordinates deployment. Safeguards follow environment capabilities, not just names — promotion eligibility, production-like confirmation, rollback expectations, secret verification, and observability.",
  },
  {
    icon: Layers3,
    eyebrow: "04 · Deliver",
    title: "Deliver to runtimes",
    body:
      "Each configured Elsa runtime receives or pulls the deployment artifact through its deployment channel, then installs and registers the workflow into its local runtime.",
  },
  {
    icon: Cpu,
    eyebrow: "05 · Operate",
    title: "Operate and promote",
    body:
      "Teams promote validated versions across environments. The platform shows environment status, deployment history, warnings, and target readiness — while runtimes remain responsible for executing workflow instances.",
  },
];

const diagram = [
  { label: "Elsa Studio", sub: "design · validate" },
  { label: "Workflow Artifact", sub: "deployable package" },
  { label: "Elsa Platform", sub: "control plane" },
  { label: "Environments", sub: "Dev · Test · UAT · Prod · custom" },
  { label: "Elsa Runtime(s)", sub: "install · register" },
  { label: "Installed Workflow", sub: "executes in runtime" },
];

const compare = [
  {
    role: "Elsa Studio",
    who: "Workflow developers",
    does: "Designs and submits deployable workflows.",
  },
  {
    role: "Elsa Platform",
    who: "Platform admins",
    does: "Validates, governs, versions, promotes, and coordinates deployments.",
  },
  {
    role: "Deployment Environment",
    who: "Workspace-defined target",
    does: "A named target such as Dev, Test, UAT, Staging, Production, or a custom tier (QA, Production EU, Demo, Certification…).",
  },
  {
    role: "Elsa Runtime",
    who: "Execution side",
    does: "Receives the artifact, installs it, and executes workflow instances.",
  },
];

const why = [
  "Separate workflow design from runtime execution.",
  "Platform admins control where workflows are allowed to go.",
  "Custom tiers preserve platform-understood safeguards.",
  "Runtimes stay focused on execution; the platform owns governance, visibility, and promotion.",
];

export default function DeploymentModel() {
  return (
    <PlatformShell
      pageTitle="Deployment model"
      seo={
        <Seo
          path="/elsa-plus/platform/deployment-model"
          title="Deployment model — Elsa Platform"
          description="From Elsa Studio to runtime environments: how Studio designs workflows, the Elsa Platform governs deployment, and Elsa runtimes install and execute them."
        />
      }
    >
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Deployment model
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          From Elsa Studio to{" "}
          <span className="text-primary">runtime environments</span>.
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground text-lg">
          Elsa Studio designs and submits deployable workflows. The Elsa Platform acts as the
          deployment control plane — validating, governing, and coordinating delivery to one or
          more Elsa runtimes, where the workflow is installed and executed.
        </p>
      </header>

      {/* Diagram */}
      <Card variant="glass">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Studio → Platform → Runtime
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              control plane vs. execution
            </span>
          </div>

          {/* Desktop diagram */}
          <div className="mt-6 hidden lg:block">
            <div className="flex items-stretch gap-2">
              {diagram.map((n, i) => (
                <div key={n.label} className="flex flex-1 items-stretch">
                  <div
                    className={`flex flex-1 flex-col justify-between rounded-lg border p-4 ${
                      i === 2
                        ? "border-primary/50 bg-primary/[0.06]"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="mt-3">
                      <div className="text-[14px] font-semibold leading-tight">
                        {n.label}
                      </div>
                      <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                        {n.sub}
                      </div>
                    </div>
                  </div>
                  {i < diagram.length - 1 && (
                    <ChevronRight className="mx-1 mt-10 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-6 gap-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <div className="col-span-3 rounded-md border border-dashed border-border/80 py-1.5">
                Control plane · governance
              </div>
              <div className="col-span-3 rounded-md border border-dashed border-border/80 py-1.5">
                Runtime · execution
              </div>
            </div>
          </div>

          {/* Mobile diagram */}
          <ol className="mt-6 space-y-2 lg:hidden">
            {diagram.map((n, i) => (
              <li
                key={n.label}
                className={`flex items-center gap-3 rounded-lg border p-4 ${
                  i === 2 ? "border-primary/50 bg-primary/[0.06]" : "border-border bg-muted/30"
                }`}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[14px] font-semibold">{n.label}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                    {n.sub}
                  </div>
                </div>
                {i < diagram.length - 1 && (
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Stages */}
      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-5">
        {stages.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex flex-col gap-4 bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {s.eyebrow}
                </span>
              </div>
              <div>
                <div className="text-[15px] font-semibold leading-tight">{s.title}</div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Roles */}
      <div className="mt-10">
        <div className="mb-5 flex items-end justify-between">
          <h3 className="text-xl font-semibold">Roles at a glance</h3>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            who does what
          </span>
        </div>
        <Card variant="glass" className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em]">
                  Role
                </th>
                <th className="hidden px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] md:table-cell">
                  Primary user
                </th>
                <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em]">
                  Responsibility
                </th>
              </tr>
            </thead>
            <tbody>
              {compare.map((r) => (
                <tr key={r.role} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 font-medium">{r.role}</td>
                  <td className="hidden px-5 py-4 font-mono text-[12px] text-muted-foreground md:table-cell">
                    {r.who}
                  </td>
                  <td className="px-5 py-4 text-[13px] text-foreground/85">{r.does}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Why this matters */}
      <Card variant="glass" className="mt-10">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-semibold">Why this matters</h3>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              governance · portability
            </span>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {why.map((w) => (
              <li
                key={w}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-[13.5px] text-foreground/90"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {w}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13px] text-muted-foreground">
            Deployment records store safe metadata and provider-backed references where secrets are
            needed — they are not a secret store, and the platform does not execute workflow
            instances itself.
          </p>
        </CardContent>
      </Card>

      <div className="mt-12">
        <ElsaPlusDisclaimer />
      </div>
    </PlatformShell>
  );
}
