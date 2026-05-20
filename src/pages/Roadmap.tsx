import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Workflow,
  Puzzle,
  Eye,
  Lock,
  Sparkles,
  Github,
  MessageCircle,
  ExternalLink,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROADMAP_ISSUE_URL = "https://github.com/elsa-workflows/elsa-core/issues/3232";
const LAST_REFRESHED = "May 19, 2026";

type Status = "shipped" | "in-progress" | "planned";

interface RoadmapItem {
  title: string;
  status: Status;
  detail?: string;
}

interface Theme {
  title: string;
  goal: string;
  icon: LucideIcon;
  items: RoadmapItem[];
  outcome: string;
}

const themes: Theme[] = [
  {
    title: "Production confidence",
    goal: "Operators trust Elsa during deploys, restarts, scale-out, and partial failures.",
    icon: Shield,
    items: [
      { title: "Graceful shutdown — back-pressure, health checks, contract tests", status: "in-progress" },
      { title: "Recovery UX for interrupted, crashed, and stuck workflow instances", status: "planned", detail: "Tracked in #4833" },
      { title: "Distributed runtime hardening — bookmarks, child completion, timers", status: "in-progress" },
      { title: "Scheduler & messaging correctness (Quartz, Hangfire, MassTransit, Kafka)", status: "in-progress" },
      { title: "Native workflow-aware background execution & actor abstraction", status: "planned" },
      { title: "Persistence & migration reliability across SQL, Postgres, Mongo", status: "planned" },
    ],
    outcome: "Rolling deploys never leave workflows ambiguous. Every admin action is observable and audited.",
  },
  {
    title: "Authoring productivity",
    goal: "Developers and business users build, understand, and change workflows without ceremony.",
    icon: Workflow,
    items: [
      { title: "Workflow organization — labels, folders, metadata search", status: "in-progress" },
      { title: "Designer reliability harness across Blazor Server, WASM, embedded", status: "planned" },
      { title: "Workflow progress & timeline API with embeddable component", status: "planned" },
      { title: "State machine Studio surface, docs, and examples", status: "in-progress" },
      { title: "First-class workflow debugging, test runners, replay from logs", status: "planned" },
      { title: "User preferences, table state, and layout persistence", status: "in-progress" },
      { title: "ElsaScript productization — diagnostics, round-tripping, examples", status: "in-progress" },
    ],
    outcome: "Teams with 100+ definitions can govern them without naming hacks. Regressions caught before release.",
  },
  {
    title: "Integrations & ecosystem",
    goal: "External systems feel like native workflow building blocks.",
    icon: Puzzle,
    items: [
      { title: "OpenAPI activity provider — typed activities from any spec", status: "planned" },
      { title: "Connector SDK — auth, secrets, generated activities, testing", status: "planned" },
      { title: "Marketplace & plugin installation on Nuplane", status: "in-progress" },
      { title: "Agents provider matrix — OpenAI, Claude, local, MCP tool lifecycle", status: "in-progress" },
      { title: "Azure DevOps, Teams, OneDrive, SharePoint, Google Workspace", status: "planned" },
      { title: "Data pipeline & ETL primitives — datasets, transforms, streams", status: "planned" },
      { title: "BPMN interoperability — import/export first, not full parity", status: "planned" },
    ],
    outcome: "Connecting a REST API is a one-step task. Extension maturity is visible to users.",
  },
  {
    title: "Observability & operations",
    goal: "Elsa is easy to inspect from Studio and standard production telemetry stacks.",
    icon: Eye,
    items: [
      { title: "OpenTelemetry module with traces and default workflow metrics", status: "planned" },
      { title: "Structured logs with durable persistence", status: "in-progress" },
      { title: "Console logs surfaced in Studio", status: "shipped" },
      { title: "Studio diagnostics — live console, log filters, incident timelines", status: "in-progress" },
      { title: "Correlated traces, spans, alterations, and runtime admin actions", status: "planned" },
      { title: "Clearer execution-history states — faulted, recovered, retried, modified", status: "planned" },
    ],
    outcome: "Operators answer 'what is stuck, why, and what changed?' from first-party telemetry alone.",
  },
  {
    title: "Security, identity & enterprise readiness",
    goal: "Elsa is straightforward to secure in real enterprise hosts.",
    icon: Lock,
    items: [
      { title: "Canonical OIDC recipes for Blazor Server, WASM, split, and combined hosts", status: "planned" },
      { title: "Production security guide — API keys, scripting trust, secret masking", status: "planned" },
      { title: "Tenant & role-based activity visibility, permission-aware Studio menus", status: "planned" },
      { title: "Multi-tenant ergonomics — high tenant counts, cache isolation", status: "in-progress" },
      { title: "Localization & white-label readiness with coverage tracking", status: "in-progress" },
      { title: "Enterprise deployment checklist — K8s, TLS, base paths, DR", status: "planned" },
    ],
    outcome: "Enterprise adopters stand up Elsa behind their IdP from docs alone. Dangerous capabilities are explicit opt-ins.",
  },
  {
    title: "AI-assisted workflow engineering",
    goal: "AI makes workflows more transparent, not less.",
    icon: Sparkles,
    items: [
      { title: "AI generation that produces visible activities, not hidden scripts", status: "planned", detail: "Proposed in #7367" },
      { title: "Elsa MCP surface — read, validate, edit, and explain workflows", status: "planned" },
      { title: "Studio copilot on top of stable authoring contracts", status: "planned" },
      { title: "'Explain workflow', 'find risks', 'suggest tests' assistants", status: "planned" },
      { title: "Generation paired with validation, tests, and review diffs", status: "planned" },
    ],
    outcome: "AI-generated workflows remain inspectable, testable, and reviewable in Studio.",
  },
];

const sequencing = [
  {
    title: "Near term",
    items: [
      "Finish graceful shutdown, recovery, and distributed runtime regressions",
      "Stabilize Studio authoring with a designer regression harness",
      "Workflow organization, progress APIs, and user-preference persistence",
      "Reconcile extension foundations — Connections, Secrets, package manifests",
    ],
  },
  {
    title: "Mid term",
    items: [
      "OpenAPI activity provider and connector SDK",
      "Extension Platform with marketplace install on Nuplane",
      "OpenTelemetry boundary and Studio trace/log correlation",
      "Workflow debugging, replay analysis, operator recovery UX",
      "Agents provider matrix and MCP tool lifecycle",
    ],
  },
  {
    title: "Longer term",
    items: [
      "Native workflow-aware background execution and actor abstraction",
      "Data pipeline and stream-processing primitives",
      "BPMN interoperability",
      "AI-assisted authoring and workflow MCP tools",
    ],
  },
];

function StatusChip({ status }: { status: Status }) {
  const label =
    status === "shipped" ? "Shipped" : status === "in-progress" ? "In progress" : "Planned";
  const cls =
    status === "shipped"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "in-progress"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-border bg-muted/40 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider shrink-0",
        cls,
      )}
    >
      {label}
    </span>
  );
}

export default function Roadmap() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Elsa Workflows Roadmap",
      url: "https://www.elsa-workflows.io/roadmap",
      description:
        "Product direction for the Elsa Workflows engine, Studio, and extensions across production, authoring, integrations, observability, security, and AI.",
    },
  ];

  return (
    <Layout>
      <Seo
        path="/roadmap"
        title="Roadmap — Elsa Workflows"
        description="Product direction for the Elsa Workflows engine, Studio, and extensions: production confidence, authoring productivity, integrations, observability, enterprise readiness, and AI-assisted workflow engineering."
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10" />

        <div className="container py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Last refreshed {LAST_REFRESHED}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Roadmap
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              A product direction document — not a fixed release calendar. Elsa is built by core
              maintainers, customer-funded work, and community contributions, so sequencing shifts
              with real-world demand. The intent is stable: make Elsa the most productive,
              dependable, and extensible workflow platform for .NET.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2" asChild>
                <a href={ROADMAP_ISSUE_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  View source on GitHub
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="https://discord.gg/hhChk5H472" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Join the community
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* North Star + Legend */}
      <section className="pb-8 md:pb-12">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ScrollReveal className="lg:col-span-2">
              <Card variant="glass" className="h-full">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">North Star</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {[
                      "Productive enough to model real business processes quickly",
                      "Dependable in production — rolling deploys, multi-tenant, distributed",
                      "Open enough to embed, customize, and extend without fighting the framework",
                      "Powerful enough for long-lived processes, human tasks, and observability",
                    ].map((n) => (
                      <li key={n} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-muted-foreground">{n}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <Card variant="glass" className="h-full">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">Status legend</h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <StatusChip status="shipped" />
                      <span className="text-muted-foreground">Live in a released package</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status="in-progress" />
                      <span className="text-muted-foreground">Active work or partial productization</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip status="planned" />
                      <span className="text-muted-foreground">Roadmap candidate, not yet started</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Themes */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container max-w-6xl">
          <ScrollReveal>
            <div className="max-w-2xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Themes</h2>
              <p className="text-muted-foreground text-lg">
                Six tracks the maintainers organize work around. Each item links back to demand
                signal in <a href={ROADMAP_ISSUE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">issue #3232</a>.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {themes.map((theme, idx) => {
              const Icon = theme.icon;
              return (
                <ScrollReveal key={theme.title} delay={idx * 80}>
                  <Card variant="glass" className="h-full">
                    <CardContent className="p-6 md:p-8 flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-5">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-semibold mb-1">{theme.title}</h3>
                          <p className="text-sm text-muted-foreground">{theme.goal}</p>
                        </div>
                      </div>

                      <ul className="space-y-3 flex-1">
                        {theme.items.map((item) => (
                          <li
                            key={item.title}
                            className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5"
                          >
                            <StatusChip status={item.status} />
                            <div className="min-w-0">
                              <p className="text-sm leading-snug">{item.title}</p>
                              {item.detail && (
                                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border/60">
                        <span className="font-medium text-foreground">Why it matters — </span>
                        {theme.outcome}
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sequencing */}
      <section className="py-16 md:py-20">
        <div className="container max-w-6xl">
          <ScrollReveal>
            <div className="max-w-2xl mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Recommended sequencing</h2>
              <p className="text-muted-foreground text-lg">
                Indicative order, not a release commitment. Customer-funded work can accelerate any
                item.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sequencing.map((slot, idx) => (
              <ScrollReveal key={slot.title} delay={idx * 100}>
                <Card variant="glass" className="h-full">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <h3 className="text-lg font-semibold">{slot.title}</h3>
                    </div>
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      {slot.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Source footer */}
      <section className="py-16 md:py-20 bg-surface-subtle">
        <div className="container max-w-4xl">
          <ScrollReveal>
            <Card variant="glass">
              <CardContent className="p-8 md:p-10 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Roadmap evolves with demand</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  This page is curated from the upstream maintainer roadmap. For the full
                  discussion, linked issues, and history, follow the source on GitHub.
                </p>
                <Button size="lg" className="gap-2" asChild>
                  <a href={ROADMAP_ISSUE_URL} target="_blank" rel="noopener noreferrer">
                    Read the full roadmap on GitHub
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>
    </Layout>
  );
}
