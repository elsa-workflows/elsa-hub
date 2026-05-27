import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Code2,
  Cpu,
  Database,
  FileJson,
  Github,
  Globe,
  Layers,
  LineChart,
  Lock,
  MessageSquare,
  Network,
  Puzzle,
  ScrollText,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  Workflow,
  Zap,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Seo } from "@/components/Seo";
import workflowGraph from "@/assets/features-workflow-graph.jpg";
import logsPanel from "@/assets/features-logs-panel.jpg";
import architectureDiagram from "@/assets/features-architecture.jpg";
import integrationsMosaic from "@/assets/features-integrations.jpg";

const featureCards = [
  {
    icon: Code2,
    title: "Build Workflows Your Way",
    description:
      "Author workflows in C#, design them visually in Elsa Studio, or store them as JSON. Keep critical automation in source control while teams collaborate in the designer.",
  },
  {
    icon: Timer,
    title: "Durable Event-Driven Runtime",
    description:
      "Model processes that pause for timers, webhooks, approvals, and messages. Elsa persists state, indexes triggers and bookmarks, and resumes the right instance when the next signal arrives.",
  },
  {
    icon: Workflow,
    title: "Visual Workflow Studio",
    description:
      "A modular Blazor-based designer and management UI with diagnostics views, authentication modules, and localization. Composable for custom platform experiences.",
  },
  {
    icon: Puzzle,
    title: "Integration-Ready Automation",
    description:
      "Built-in activities for HTTP, scheduling, SQL, messaging, files, and email — plus an extension ecosystem for Slack, GitHub, Service Bus, Kafka, and AI agents.",
  },
  {
    icon: Settings2,
    title: "Production Workflow Operations",
    description:
      "Runtime administration, execution journals, graceful shutdown, recovery scanning, dead-letter handling, and a transactional dispatch outbox built for real operators.",
  },
  {
    icon: LineChart,
    title: "Observable by Design",
    description:
      "Inspect execution history, activity records, structured logs, raw console output, source metadata, trace and span correlation, tenant, and workflow context from API or Studio.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Multi-Tenant Platform",
    description:
      "Identity, authorization, tenant-aware behavior, encrypted secrets, authenticated SignalR diagnostics, and permission-gated APIs for SaaS and regulated systems.",
  },
  {
    icon: Layers,
    title: "Extensible by Developers",
    description:
      "Custom activities, expression providers, API endpoints, stores, workflow providers, Studio modules, log sinks, and authentication providers — every layer has clear extension points.",
  },
];

const integrationCategories = [
  { icon: Globe, label: "HTTP & APIs", items: "Endpoints, webhooks, OpenAPI, file responses" },
  { icon: Timer, label: "Scheduling", items: "Cron, delay, Quartz, Hangfire" },
  { icon: Database, label: "Databases", items: "SQL Server, PostgreSQL, MySQL, SQLite, Mongo" },
  { icon: Network, label: "Messaging", items: "Azure Service Bus, Kafka, MassTransit" },
  { icon: Github, label: "DevOps", items: "GitHub issues, PRs, releases, GraphQL" },
  { icon: MessageSquare, label: "Communication", items: "Slack, email, Telnyx telephony" },
  { icon: FileJson, label: "Files & Storage", items: "Blob storage, CSV, ZIP, local files" },
  { icon: Sparkles, label: "AI Agents", items: "OpenAI, Azure OpenAI, multi-agent workflows" },
];

const operationsItems = [
  {
    icon: Server,
    title: "Graceful shutdown",
    description: "Node-local quiescence, drain orchestration, and ingress pause/resume so operators stop servers without losing mid-flight work.",
  },
  {
    icon: Zap,
    title: "Recovery scanning",
    description: "Workflows interrupted by shutdowns or crashes are detected and resumed from their last persisted state.",
  },
  {
    icon: ScrollText,
    title: "Dead-letter queues",
    description: "Expired or exhausted bookmark queue items move to a dead-letter store with APIs to inspect, replay, or delete.",
  },
  {
    icon: Cpu,
    title: "Transactional dispatch outbox",
    description: "At-least-once delivery for workflow dispatches with idempotency support — no silent loss on crash.",
  },
  {
    icon: Terminal,
    title: "Runtime admin APIs",
    description: "Status, pause, resume, and force-drain endpoints to control workflow runtime state from your own tooling.",
  },
  {
    icon: Lock,
    title: "Redaction & permissions",
    description: "Sensitive log data redacted before storage and streaming; diagnostics endpoints permission-gated by default.",
  },
];

const architectureCards = [
  {
    icon: Boxes,
    title: "Modular feature system",
    description:
      "Compose only the modules you need through explicit feature registration. Keep hosts lean and build your own modules with the same conventions as first-party packages.",
  },
  {
    icon: Layers,
    title: "Provider-neutral boundaries",
    description:
      "Persistence, scheduling, logging, identity, storage, and SQL clients all sit behind provider contracts. Standardize on the infrastructure you already operate.",
  },
  {
    icon: Code2,
    title: "API-first, Studio-ready",
    description:
      "Every capability is exposed through APIs first and then surfaced in Studio. Automate, build your own UI, or use Studio — same contracts underneath.",
  },
];

export default function Features() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Elsa Workflows — Features",
      url: "https://www.elsa-workflows.io/features",
      description:
        "Embeddable .NET workflow engine: durable runtime, visual Studio, integrations, observability, multi-tenancy, and production operations.",
    },
  ];

  return (
    <Layout>
      <Seo
        path="/features"
        title="Features — Elsa Workflows engine for .NET"
        description="Embeddable .NET workflow engine and visual Studio: durable event-driven runtime, integrations, observability, multi-tenancy, and production operations."
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="container py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
                <span className="h-px w-8 bg-primary" />
                Platform overview
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
                Workflow automation for{" "}
                <span className="text-primary">.NET teams</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8">
                Elsa is an open-source workflow engine and visual workflow platform for
                building long-running, event-driven, and integration-heavy processes inside
                your own .NET applications.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/get-started">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a
                    href="https://github.com/elsa-workflows/elsa-core"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    View on GitHub
                  </a>
                </Button>
                <Button size="lg" variant="ghost" className="gap-2" asChild>
                  <a
                    href="https://docs.elsaworkflows.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-4 w-4" />
                    Docs
                  </a>
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <img
                  src={workflowGraph}
                  alt="Elsa workflow graph with HTTP trigger, conditional branching, ForEach loop, wait-for-event, and send email activities"
                  width={1536}
                  height={1024}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-20 md:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-2xl mb-14">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                A serious workflow platform, not a flowchart toy
              </h2>
              <p className="text-lg text-muted-foreground">
                Eight capabilities engineering teams actually evaluate against — from
                authoring flexibility to production-grade operations.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="bg-card p-7 flex flex-col"
              >
                <feature.icon
                  className="h-6 w-6 text-primary mb-5"
                  strokeWidth={1.5}
                />
                <h3 className="text-base font-semibold mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture band */}
      <section className="py-20 md:py-28 bg-surface-subtle border-y border-border">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
                <span className="h-px w-8 bg-primary" />
                Architecture
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5">
                Modular, provider-neutral, extensible
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Elsa is a library, not a platform you have to adopt wholesale. Plug in
                your persistence, scheduling, identity, logging, and storage choices —
                then extend the engine with your own modules and activities.
              </p>
              <div className="space-y-5">
                {architectureCards.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="h-9 w-9 shrink-0 rounded-md border border-border bg-card flex items-center justify-center">
                      <item.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <img
                  src={architectureDiagram}
                  alt="Elsa runtime architecture: persistence, messaging, identity, HTTP, scheduling, and activities surround the runtime"
                  width={1536}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations band */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
                <span className="h-px w-8 bg-primary" />
                Integrations
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5">
                Connect workflows to real systems
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                First-party and extension activities cover the integration surface most
                .NET teams need on day one — and the activity model is the extension
                point for everything else.
              </p>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <img
                  src={integrationsMosaic}
                  alt="Integration tiles for SQL, scheduling, messaging, email, files, AI, webhooks, and secrets"
                  width={1536}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
                {integrationCategories.map((cat) => (
                  <div key={cat.label} className="bg-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <cat.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      <h3 className="font-semibold tracking-tight">{cat.label}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{cat.items}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                Additional ecosystem integrations (Teams, GitLab, OPC UA, MQTT Sparkplug,
                and others) are on the extensions roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Operations band */}
      <section className="py-20 md:py-28 bg-surface-subtle border-y border-border">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-12 max-w-2xl mb-2">
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-6">
                <span className="h-px w-8 bg-primary" />
                Operations & observability
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5">
                Built for production workflow operations
              </h2>
              <p className="text-lg text-muted-foreground">
                The details architects and CTOs check before standardizing on a workflow
                engine — graceful shutdown, recovery, dead-letter handling, durable
                dispatch, redaction, and runtime administration.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border">
                {operationsItems.map((item) => (
                  <div key={item.title} className="bg-card p-6">
                    <item.icon
                      className="h-5 w-5 text-primary mb-3"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-semibold mb-1.5 tracking-tight">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground tracking-wide">
                    Structured diagnostics
                  </span>
                </div>
                <img
                  src={logsPanel}
                  alt="Diagnostics log panel showing workflow lifecycle events with severity, timestamps, and trace details"
                  width={1536}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Structured logs, raw console capture, and OpenTelemetry-aware diagnostics —
                all queryable from APIs and streamed live to Studio over SignalR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="container">
          <Card className="border-border">
            <CardContent className="p-10 md:p-14">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7">
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                    Ready to embed Elsa in your stack?
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    Pull the Docker image, install the NuGet packages, or read the docs.
                    Open source, MIT licensed, production-tested.
                  </p>
                </div>
                <div className="md:col-span-5 flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 md:justify-end">
                  <Button size="lg" className="gap-2" asChild>
                    <Link to="/get-started/docker">
                      <Terminal className="h-4 w-4" />
                      Try the Docker image
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" asChild>
                    <a
                      href="https://docs.elsaworkflows.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen className="h-4 w-4" />
                      Read the docs
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
