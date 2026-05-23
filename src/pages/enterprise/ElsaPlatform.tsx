import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileCode2,
  Package,
  ShieldCheck,
  ClipboardList,
  Eye,
  PlayCircle,
  History,
  ChevronRight,
  Library,
  Layers,
  Boxes,
  Target,
  Server,
  Activity,
  ScrollText,
  Bot,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  RefreshCcw,
  GitMerge,
  Rocket,
  Network,
  Sparkles,
  Target as TargetIcon,
  Flag,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";

type Status = "Now" | "Next" | "Later";

function StatusBadge({ status }: { status: Status }) {
  const variants: Record<Status, string> = {
    Now: "bg-primary/10 text-primary border-primary/30",
    Next: "bg-accent/10 text-accent-foreground border-accent/30",
    Later: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${variants[status]}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {status}
    </span>
  );
}

const loopSteps = [
  { label: "Manifest", icon: FileCode2 },
  { label: "Artifact", icon: Package },
  { label: "Validation", icon: ShieldCheck },
  { label: "Dry-run", icon: Eye },
  { label: "Apply", icon: PlayCircle },
  { label: "History", icon: History },
];

const pillars: {
  icon: typeof Boxes;
  title: string;
  sub: string;
  points: string[];
  status: Status;
}[] = [
  {
    icon: Library,
    title: "Package Catalog",
    sub: "Discover & govern packages",
    points: [
      "Package discovery & manifests",
      "Approval and listing state",
      "Compatibility metadata",
      "Source trust signals",
    ],
    status: "Now",
  },
  {
    icon: Layers,
    title: "Runtime Builder",
    sub: "Compose runtimes declaratively",
    points: [
      "Pick packages & features",
      "Compatibility checks",
      "Saved configurations",
      "Runtime bundles & templates",
    ],
    status: "Now",
  },
  {
    icon: Boxes,
    title: "Deployments",
    sub: "Manifest → artifact → apply",
    points: [
      "Versioned manifests",
      "Validation, diff, dry-run",
      "Idempotent apply",
      "Full deployment history",
    ],
    status: "Next",
  },
  {
    icon: Target,
    title: "Targets",
    sub: "Where deployments land",
    points: [
      "Cloud, self-hosted, air-gapped",
      "CLI, API, GitOps surfaces",
      "Per-environment configuration",
      "Secret references, not secrets",
    ],
    status: "Next",
  },
  {
    icon: Server,
    title: "Managed Runtimes",
    sub: "Hosted Elsa environments",
    points: [
      "Provisioned from runtime configs",
      "Versioned upgrades & rollback",
      "Tenant isolation",
      "Backed by deployment history",
    ],
    status: "Later",
  },
  {
    icon: Activity,
    title: "Runtime Operations",
    sub: "Observe and intervene safely",
    points: [
      "Logs, metrics, health",
      "Drift detection & approvals",
      "Controlled upgrades",
      "Backup & restore",
    ],
    status: "Later",
  },
  {
    icon: ScrollText,
    title: "Audit",
    sub: "A record of what changed",
    points: [
      "Deployment provenance",
      "Who / what / when",
      "Diff against prior state",
      "Exportable history",
    ],
    status: "Next",
  },
  {
    icon: Bot,
    title: "AI Assistants",
    sub: "Helpers for platform users",
    points: [
      "Explain packages & options",
      "Guide runtime configuration",
      "Summarize validation & diffs",
      "Suggest safe next steps",
    ],
    status: "Later",
  },
];

const pipeline = [
  { id: "author-manifest", icon: FileCode2, title: "Author manifest", body: "Versioned EnvironmentManifest (YAML/JSON, v1alpha)." },
  { id: "build-artifact", icon: Package, title: "Build artifact", body: "Reproducible folder or ZIP artifact." },
  { id: "validate", icon: ShieldCheck, title: "Validate", body: "Schema, resources, packages, compatibility." },
  { id: "plan", icon: ClipboardList, title: "Plan", body: "Deterministic deployment plan with desired-state hashes." },
  { id: "preview", icon: Eye, title: "Preview", body: "Diff + dry-run before any change is applied." },
  { id: "apply", icon: PlayCircle, title: "Apply", body: "Idempotent. Re-apply the same artifact safely." },
  { id: "record", icon: History, title: "Record", body: "Deployment history with full provenance." },
];

function scrollToStep(id: string) {
  const el = document.getElementById(`pipeline-step-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
  }, 1600);
}

function PipelineDiagram() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 p-6 md:p-10 mb-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black 50%, transparent 100%)",
        }}
      />
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Interactive flow
          </span>
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:block">
            click a step to jump to details
          </span>
        </div>

        <div className="flex flex-wrap items-start justify-center gap-y-5">
          {pipeline.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => scrollToStep(s.id)}
                  className="group flex flex-col items-center gap-2 focus:outline-none"
                  aria-label={`Jump to ${s.title}`}
                >
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-background shadow-sm transition-all group-hover:scale-110 group-hover:border-primary group-hover:shadow-md group-hover:shadow-primary/20 group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background md:h-16 md:w-16">
                    <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <span className="max-w-[88px] text-center text-[12px] font-medium leading-tight transition-colors group-hover:text-primary md:text-[13px]">
                    {s.title}
                  </span>
                </button>
                {i < pipeline.length - 1 && (
                  <div className="mx-1 mt-7 flex items-center sm:mx-2" aria-hidden="true">
                    <svg width="28" height="14" viewBox="0 0 28 14" className="text-primary/40">
                      <path d="M 0 7 L 22 7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
                      <path d="M 20 2 L 26 7 L 20 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Phase = {
  tag: string;
  title: string;
  horizon: string;
  status: Status;
  icon: typeof Rocket;
  summary: string;
  objective: string;
  outcome: string;
  items: { title: string; detail: string }[];
};

const phases: Phase[] = [
  {
    tag: "Phase 1",
    title: "Foundation",
    horizon: "Now → Next",
    status: "Now",
    icon: Rocket,
    summary: "The deterministic deployment loop, CLI-first.",
    objective:
      "Ship a credible, end-to-end deployment loop for workflows and runtime configuration that a single team can adopt without operator support.",
    outcome:
      "Teams stop hand-rolling deployment scripts. Every change to workflows, variables, and packages is versioned, validated, previewed, and recorded.",
    items: [
      {
        title: "Manifest schema (v1alpha)",
        detail:
          "Versioned EnvironmentManifest in YAML/JSON with a stable v1alpha contract — workflows, variables, packages, features, recipes.",
      },
      {
        title: "Folder & ZIP artifacts",
        detail:
          "Reproducible artifacts built from a manifest — directory layout for development, signed ZIP for promotion across environments.",
      },
      {
        title: "Workflows & variables as deployment targets",
        detail:
          "First-class resources, not config side-effects. Diffed, planned, and applied like any other declarative resource.",
      },
      {
        title: "CLI-first deployment loop",
        detail:
          "elsa validate · plan · preview · apply. Scriptable in CI from day one, no UI required to be productive.",
      },
      {
        title: "Validation, dry-run, apply",
        detail:
          "Schema and compatibility validation, deterministic plans, full dry-run, and idempotent apply that is safe to re-run.",
      },
      {
        title: "Deployment history",
        detail:
          "Every applied artifact recorded with provenance: who, what, when, against which target, and the diff against prior state.",
      },
    ],
  },
  {
    tag: "Phase 2",
    title: "Enterprise",
    horizon: "Later · near-term",
    status: "Next",
    icon: ShieldCheck,
    summary: "Trust, supply chain, and GitOps.",
    objective:
      "Make the deployment loop safe to operate across multiple teams and environments — with approvals, signed artifacts, and external operators.",
    outcome:
      "Regulated and security-conscious teams adopt Elsa Platform without bolting on bespoke approval and signing tooling.",
    items: [
      {
        title: "Drift detection & approvals",
        detail:
          "Continuous comparison of applied state vs. desired state, with approval gates before re-applying or reconciling drift.",
      },
      {
        title: "Signed artifacts & OCI compatibility",
        detail:
          "Cryptographic signing of deployment artifacts and distribution via OCI registries alongside container images.",
      },
      {
        title: "GitOps & external operators",
        detail:
          "Pull-based reconciliation from Git, plus an operator surface so external systems can drive deployments.",
      },
      {
        title: "Overlays & secret references",
        detail:
          "Environment overlays merged into the manifest at plan time. Secrets stay in their managers — manifests reference them.",
      },
      {
        title: "Promotion flows",
        detail:
          "Promote the exact same artifact through dev → staging → prod with environment-scoped overlays and approval gates.",
      },
      {
        title: "Audit metadata",
        detail:
          "Rich, exportable audit records linking artifacts, plans, approvers, and the resulting deployment history entries.",
      },
    ],
  },
  {
    tag: "Phase 3",
    title: "Platform Engineering",
    horizon: "Later · fleet-scale",
    status: "Later",
    icon: Network,
    summary: "Fleet-scale reconciliation for platform teams.",
    objective:
      "Operate Elsa as a managed platform across many tenants and clusters — with policies, attestations, and progressive rollouts.",
    outcome:
      "Platform teams treat Elsa runtimes the way SRE treats Kubernetes workloads: declarative, observable, policy-governed, and progressively rolled out.",
    items: [
      {
        title: "Multi-tenant reconciliation",
        detail:
          "Reconcile desired state for many tenants in parallel, with isolation guarantees and per-tenant deployment history.",
      },
      {
        title: "Fleet management",
        detail:
          "Manage groups of runtimes as fleets — shared baselines, targeted overrides, and bulk operations with safety rails.",
      },
      {
        title: "Kubernetes CRDs",
        detail:
          "Native CRDs so Elsa resources are first-class on Kubernetes and reconciled by an in-cluster controller.",
      },
      {
        title: "Progressive rollout",
        detail:
          "Canary and waved rollouts across the fleet with automated health checks and fast rollback to the previous artifact.",
      },
      {
        title: "Policy engine & attestations",
        detail:
          "Pluggable policies gate plans and applies. Attestations capture which policies passed for any given deployment.",
      },
      {
        title: "Distributed reconcilers & dashboards",
        detail:
          "Horizontally scalable reconcilers with platform-team dashboards for fleet health, drift, and deployment activity.",
      },
    ],
  },
];

const takeaways = [
  { icon: ShieldCheck, title: "Safer releases", body: "For workflows and runtime configuration." },
  { icon: RefreshCcw, title: "Reproducible environments", body: "Same manifest, same artifact, same result." },
  { icon: GitMerge, title: "CI/CD-friendly", body: "Validate, dry-run, and apply fit any pipeline." },
  { icon: Library, title: "Governed packages", body: "Selection and compatibility enforced at the boundary." },
  { icon: Bot, title: "Assistants for users", body: "Help understand, configure, and deploy safely." },
];

function InteractiveRoadmap() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const active = phases[activeIdx];
  const ActiveIcon = active.icon;

  const toggle = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="relative">
      {/* Timeline rail */}
      <div className="relative">
        <div
          className="absolute left-0 right-0 top-5 h-px bg-border md:top-6"
          aria-hidden="true"
        />
        <div
          className="absolute left-0 top-5 h-px bg-gradient-to-r from-primary via-primary/60 to-transparent transition-all duration-500 md:top-6"
          style={{ width: `${((activeIdx + 0.5) / phases.length) * 100}%` }}
          aria-hidden="true"
        />

        <ol className="relative grid grid-cols-3 gap-3">
          {phases.map((p, i) => {
            const Icon = p.icon;
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            return (
              <li key={p.tag} className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  aria-pressed={isActive}
                  aria-label={`Show ${p.title}`}
                  className={`group relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background transition-all md:h-12 md:w-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    isActive
                      ? "border-primary shadow-lg shadow-primary/25 scale-110"
                      : isPast
                        ? "border-primary/60"
                        : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors md:h-5 md:w-5 ${
                      isActive || isPast ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  {isActive && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
                  )}
                </button>
                <div className="mt-3 hidden md:block">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {p.tag}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`mt-1 text-[14px] font-semibold transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.title}
                  </button>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {p.horizon}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`mt-2 text-[11px] font-semibold md:hidden ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {p.title}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Active phase detail */}
      <Card variant="glass" className="mt-10">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <ActiveIcon className="h-6 w-6" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {active.tag} · {active.horizon}
                  </span>
                  <StatusBadge status={active.status} />
                </div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                  {active.title}
                </h3>
                <p className="mt-1 text-[15px] text-muted-foreground">{active.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:self-end">
              <button
                type="button"
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                disabled={activeIdx === 0}
                className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setActiveIdx((i) => Math.min(phases.length - 1, i + 1))}
                disabled={activeIdx === phases.length - 1}
                className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-primary">
                <TargetIcon className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  Objective
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">
                {active.objective}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-primary">
                <Flag className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                  Outcome
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">
                {active.outcome}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                What ships in this phase
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                click to expand
              </span>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {active.items.map((it, idx) => {
                const key = `${active.tag}-${idx}`;
                const isOpen = !!openItems[key];
                return (
                  <li key={key} className="bg-background/40">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[14.5px] font-medium">{it.title}</span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-90 text-primary" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ${
                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-4 pl-12 text-[13.5px] leading-relaxed text-muted-foreground">
                          {it.detail}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ElsaPlatform() {
  return (
    <Layout>
      <Seo
        path="/elsa-plus/platform"
        title="Elsa Platform — Control plane for Elsa Workflows"
        description="Design, package, validate, deploy, and operate Elsa-based workflow systems across environments with a declarative, auditable control plane."
      />

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container max-w-6xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus">Elsa+</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Elsa Platform</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            control plane · v1alpha · in development
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl md:text-6xl font-bold leading-tight tracking-tight">
            Elsa <span className="text-primary">Platform</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Design, package, validate, deploy, and operate Elsa-based workflow systems across
            environments — and run AI assistants on workflows you can audit and govern.
          </p>

          {/* Core loop */}
          <Card variant="glass" className="mt-12">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Core deployment loop
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

          {/* meta strip */}
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-border pt-8 text-sm md:grid-cols-4">
            {[
              ["Resource model", "Workflows · Variables · Features · Packages · Recipes"],
              ["Surfaces", "CLI · API · GitOps-ready"],
              ["Separation", "Control plane reconciles desired state; not runtime execution"],
              ["Portable", "Cloud · self-hosted · air-gapped"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {k}
                </div>
                <div className="mt-1.5 text-[13.5px] leading-snug">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-16 md:py-20">
        <div className="container max-w-6xl">
          <div className="max-w-3xl mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Why it exists
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Workflows and runtime config need{" "}
              <span className="text-primary">reproducible, auditable</span> deployment.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Environments drift. Hand-rolled scripts hide changes. Elsa Platform replaces ad-hoc
              deployment with declarative desired state, predictable plans, safe previews, and an
              idempotent apply backed by deployment history.
            </p>
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
                body: "Deployments manage control-plane state: workflow definitions, variables, packages, features, recipes, schedules, permissions, and secret references. They do not move running instances, execution logs, queues, bookmarks, or other runtime data.",
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.label} variant="glass">
                  <CardContent className="p-7">
                    <div className={`flex items-center gap-2 ${c.tone}`}>
                      <Icon className="h-4 w-4" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                        {c.label}
                      </span>
                    </div>
                    <p className="mt-4 text-[15px] leading-relaxed text-foreground/85">{c.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 md:py-20 bg-surface-subtle">
        <div className="container max-w-6xl">
          <div className="max-w-3xl mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Platform surface
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              One Elsa story, eight surfaces.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From governed packages and runtime composition, through safe deployment to targets and
              managed runtimes, to day-two operations, audit, and AI assistants — all parts of one
              Elsa Platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} variant="glass" className="h-full">
                  <CardContent className="flex h-full flex-col gap-5 p-6">
                    <div className="flex items-start justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{p.title}</h3>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {p.sub}
                      </p>
                    </div>
                    <ul className="space-y-1.5 text-[13.5px] text-foreground/85">
                      {p.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Deployment pipeline */}
      <section className="py-16 md:py-20">
        <div className="container max-w-6xl">
          <div className="max-w-3xl mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Deployment deep dive
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              From manifest to history, in a single deterministic pipeline.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Every release flows through the same seven-step pipeline. Plans are deterministic.
              Applies are idempotent. Re-running the same artifact is always safe.
            </p>
          </div>

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
                  Workflow definitions, variables, packages, features, recipes, schedules,
                  permissions, and secret references — versioned and reproducible across
                  environments.
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
                  runtime data. Elsa Platform does not replace Terraform or secret managers, and
                  does not migrate live runtime state.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-16 md:py-20 bg-surface-subtle">
        <div className="container max-w-6xl">
          <div className="max-w-3xl mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Roadmap
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Three phases. One control plane.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From a foundational deployment loop to fleet-scale platform engineering — built
              additively, with stable contracts at each phase.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {phases.map((p, i) => (
              <Card key={p.tag} variant="glass" className="h-full">
                <CardContent className="p-7">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold ${
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : i === 1
                            ? "bg-accent text-accent-foreground"
                            : "border border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {p.tag} · {p.horizon}
                      </div>
                      <div className="text-xl font-semibold">{p.title}</div>
                    </div>
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {p.items.map((it) => (
                      <li
                        key={it}
                        className="flex items-start gap-2.5 text-[14px] text-foreground/90"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Takeaway */}
      <section className="py-16 md:py-20">
        <div className="container max-w-6xl">
          <div className="max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary mb-3">
              Executive takeaway
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              From workflow design to governed deployment.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Define desired state, build immutable artifacts, validate changes, preview the impact,
              apply safely, and keep a full history of what changed — with AI assistants on hand to
              help users understand each step.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {takeaways.map((it) => {
              const Icon = it.icon;
              return (
                <Card key={it.title} variant="glass" className="h-full">
                  <CardContent className="p-6">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="mt-4 text-[15px] font-semibold">{it.title}</div>
                    <div className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                      {it.body}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10">
            <Link
              to="/elsa-plus"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Back to Elsa+ <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container max-w-4xl">
          <ElsaPlusDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
