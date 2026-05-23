import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  RefreshCcw,
  GitMerge,
  Rocket,
  Network,
  Target as TargetIcon,
  Flag,
  Compass,
  Workflow,
  GitBranch,
  Map as MapIcon,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

// ---------- Types & data ----------

export type Status = "Now" | "Next" | "Later";

export function StatusBadge({ status }: { status: Status }) {
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

export const loopSteps = [
  { label: "Manifest", icon: FileCode2 },
  { label: "Artifact", icon: Package },
  { label: "Validation", icon: ShieldCheck },
  { label: "Dry-run", icon: Eye },
  { label: "Apply", icon: PlayCircle },
  { label: "History", icon: History },
];

export const pillars: {
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

export const pipeline = [
  { id: "author-manifest", icon: FileCode2, title: "Author manifest", body: "Versioned EnvironmentManifest (YAML/JSON, v1alpha)." },
  { id: "build-artifact", icon: Package, title: "Build artifact", body: "Reproducible folder or ZIP artifact." },
  { id: "validate", icon: ShieldCheck, title: "Validate", body: "Schema, resources, packages, compatibility." },
  { id: "plan", icon: ClipboardList, title: "Plan", body: "Deterministic deployment plan with desired-state hashes." },
  { id: "preview", icon: Eye, title: "Preview", body: "Diff + dry-run before any change is applied." },
  { id: "apply", icon: PlayCircle, title: "Apply", body: "Idempotent. Re-apply the same artifact safely." },
  { id: "record", icon: History, title: "Record", body: "Deployment history with full provenance." },
];

export function scrollToPipelineStep(id: string) {
  const el = document.getElementById(`pipeline-step-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
  }, 1600);
}

export function PipelineDiagram() {
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
                  onClick={() => scrollToPipelineStep(s.id)}
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

export const phases: Phase[] = [
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
      { title: "Manifest schema (v1alpha)", detail: "Versioned EnvironmentManifest in YAML/JSON with a stable v1alpha contract — workflows, variables, packages, features, recipes." },
      { title: "Folder & ZIP artifacts", detail: "Reproducible artifacts built from a manifest — directory layout for development, signed ZIP for promotion across environments." },
      { title: "Workflows & variables as deployment targets", detail: "First-class resources, not config side-effects. Diffed, planned, and applied like any other declarative resource." },
      { title: "CLI-first deployment loop", detail: "elsa validate · plan · preview · apply. Scriptable in CI from day one, no UI required to be productive." },
      { title: "Validation, dry-run, apply", detail: "Schema and compatibility validation, deterministic plans, full dry-run, and idempotent apply that is safe to re-run." },
      { title: "Deployment history", detail: "Every applied artifact recorded with provenance: who, what, when, against which target, and the diff against prior state." },
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
      { title: "Drift detection & approvals", detail: "Continuous comparison of applied state vs. desired state, with approval gates before re-applying or reconciling drift." },
      { title: "Signed artifacts & OCI compatibility", detail: "Cryptographic signing of deployment artifacts and distribution via OCI registries alongside container images." },
      { title: "GitOps & external operators", detail: "Pull-based reconciliation from Git, plus an operator surface so external systems can drive deployments." },
      { title: "Overlays & secret references", detail: "Environment overlays merged into the manifest at plan time. Secrets stay in their managers — manifests reference them." },
      { title: "Promotion flows", detail: "Promote the exact same artifact through dev → staging → prod with environment-scoped overlays and approval gates." },
      { title: "Audit metadata", detail: "Rich, exportable audit records linking artifacts, plans, approvers, and the resulting deployment history entries." },
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
      { title: "Multi-tenant reconciliation", detail: "Reconcile desired state for many tenants in parallel, with isolation guarantees and per-tenant deployment history." },
      { title: "Fleet management", detail: "Manage groups of runtimes as fleets — shared baselines, targeted overrides, and bulk operations with safety rails." },
      { title: "Kubernetes CRDs", detail: "Native CRDs so Elsa resources are first-class on Kubernetes and reconciled by an in-cluster controller." },
      { title: "Progressive rollout", detail: "Canary and waved rollouts across the fleet with automated health checks and fast rollback to the previous artifact." },
      { title: "Policy engine & attestations", detail: "Pluggable policies gate plans and applies. Attestations capture which policies passed for any given deployment." },
      { title: "Distributed reconcilers & dashboards", detail: "Horizontally scalable reconcilers with platform-team dashboards for fleet health, drift, and deployment activity." },
    ],
  },
];

export const takeaways = [
  { icon: ShieldCheck, title: "Safer releases", body: "For workflows and runtime configuration." },
  { icon: RefreshCcw, title: "Reproducible environments", body: "Same manifest, same artifact, same result." },
  { icon: GitMerge, title: "CI/CD-friendly", body: "Validate, dry-run, and apply fit any pipeline." },
  { icon: Library, title: "Governed packages", body: "Selection and compatibility enforced at the boundary." },
  { icon: Bot, title: "Assistants for users", body: "Help understand, configure, and deploy safely." },
];

export function InteractiveRoadmap() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const active = phases[activeIdx];
  const ActiveIcon = active.icon;

  const toggle = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-0 right-0 top-5 h-px bg-border md:top-6" aria-hidden="true" />
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
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Objective</span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">{active.objective}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <div className="flex items-center gap-2 text-primary">
                <Flag className="h-4 w-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Outcome</span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">{active.outcome}</p>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                What ships in this phase
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">click to expand</span>
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

// ---------- Shared shell with sidebar nav ----------

export const platformNav = [
  { to: "/elsa-plus/platform", label: "Overview", icon: Compass, end: true },
  { to: "/elsa-plus/platform/deployment-loop", label: "Deployment loop", icon: Workflow },
  { to: "/elsa-plus/platform/surfaces", label: "Surfaces", icon: Layers },
  { to: "/elsa-plus/platform/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/elsa-plus/platform/roadmap", label: "Roadmap", icon: MapIcon },
];

function PlatformSidebar() {
  return (
    <nav aria-label="Elsa Platform sections" className="space-y-1">
      <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Elsa Platform
      </div>
      {platformNav.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function PlatformTopNav() {
  return (
    <nav
      aria-label="Elsa Platform sections"
      className="lg:hidden -mx-4 overflow-x-auto border-b border-border bg-background/80 px-4 backdrop-blur"
    >
      <ul className="flex min-w-max items-center gap-1 py-2">
        {platformNav.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PlatformShell({
  pageTitle,
  seo,
  children,
}: {
  pageTitle: string;
  seo: ReactNode;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const isOverview = pathname === "/elsa-plus/platform";

  return (
    <Layout>
      {seo}
      <div className="container max-w-7xl py-8 md:py-12">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/elsa-plus">Elsa+</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isOverview ? (
                <BreadcrumbPage>Elsa Platform</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus/platform">Elsa Platform</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!isOverview && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <PlatformTopNav />

        <div className="mt-6 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <PlatformSidebar />
            </div>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </Layout>
  );
}
