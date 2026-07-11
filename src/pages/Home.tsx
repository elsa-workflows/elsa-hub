import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Github,
  MessageCircle,
  Newspaper,
  Map,
  Terminal,
  Workflow,
  Boxes,
  Activity,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { track } from "@/lib/analytics";
import elsaStudioDesigner from "@/assets/elsa-studio-designer.png";
import elsaStudioDesignerMobile from "@/assets/elsa-studio-designer-mobile.png";

const DOCS_URL = "https://docs.elsaworkflows.io/";
const GITHUB_URL = "https://github.com/elsa-workflows/elsa-core";
const DISCORD_URL = "https://discord.gg/hhChk5H472";

const embedSnippet = `// Program.cs — embed Elsa in your .NET app
services.AddElsa(elsa =>
{
    elsa.UseWorkflows();
    elsa.UseHttp();
    elsa.UseScheduling();
});`;

const deploySnippet = `# Run Elsa Server + Studio with Docker
docker run -d -p 8080:8080 \\
  --name elsa-server \\
  elsaworkflows/elsa-server-and-studio-v3:latest`;

const buildRunOperate = [
  {
    icon: Workflow,
    title: "Build",
    body: "Author workflows in C#, visually in Elsa Studio, or store them as JSON — the same definition powers every surface.",
  },
  {
    icon: Boxes,
    title: "Run",
    body: "Execute short-running, long-running, scheduled, and event-driven workflows on a durable, persistent runtime.",
  },
  {
    icon: Activity,
    title: "Operate",
    body: "Inspect execution history, structured logs, and workflow instances from the Studio management UI or the API.",
  },
];

const useCases = [
  {
    title: "Business process automation",
    body: "Approvals, onboarding, and back-office processes with human-in-the-loop steps and durable state.",
  },
  {
    title: "Integration & orchestration",
    body: "HTTP, messaging, scheduling, SQL, files, and email activities compose long-running integration flows.",
  },
  {
    title: "Event-driven systems",
    body: "React to webhooks, message-bus events, and timers with workflows that resume exactly where they left off.",
  },
];

const communityLinks: Array<{
  icon: typeof Github;
  title: string;
  description: string;
  href?: string;
  to?: string;
}> = [
  { icon: Github, title: "GitHub", description: "Source, issues, discussions", href: GITHUB_URL },
  { icon: Newspaper, title: "Blog", description: "Release notes and deep dives", to: "/blog" },
  { icon: Map, title: "Roadmap", description: "What we are working on next", to: "/roadmap" },
  { icon: MessageCircle, title: "Discord", description: "Talk to the community", href: DISCORD_URL },
];

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Elsa Workflows",
      url: "https://www.elsa-workflows.io",
      logo: "https://www.elsa-workflows.io/elsa-logo.png",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Elsa Workflows",
      url: "https://www.elsa-workflows.io",
    },
  ];

  return (
    <Layout>
      <Seo
        path="/"
        title="Elsa Workflows — Open-source workflow infrastructure for .NET"
        description="Elsa gives .NET teams an embeddable workflow engine and a deployable Server and Studio for building long-running, event-driven, and scheduled processes."
        jsonLd={jsonLd}
      />

      {/* 1. Hero */}
      <section className="border-b border-border/60">
        <div className="container py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary mb-4">
                Open-source workflow infrastructure for .NET
              </p>
              <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.05] font-semibold tracking-tight mb-6">
                Build, run, and operate workflows in your .NET stack.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
                Elsa gives .NET teams an embeddable workflow engine and a deployable
                Server and Studio for building long-running, event-driven, and
                scheduled processes.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <Link
                    to="/get-started"
                    onClick={() => track("hero_cta_click", { cta: "get_started" })}
                  >
                    <Terminal className="h-4 w-4" />
                    Get started
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("hero_secondary_click", { cta: "documentation" })}
                  >
                    <BookOpen className="h-4 w-4" />
                    Read the docs
                  </a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Github className="h-4 w-4" /> elsa-workflows/elsa-core
                </a>
                <span className="inline-flex items-center gap-1.5">
                  MIT licensed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  .NET Foundation project
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-xl border border-border bg-card p-1.5 shadow-sm">
                <img
                  src={elsaStudioDesignerMobile}
                  alt="Elsa Studio workflow designer"
                  className="block md:hidden w-full h-auto rounded-lg"
                  width={800}
                  height={600}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
                <img
                  src={elsaStudioDesigner}
                  alt="Elsa Studio visual workflow designer showing a workflow with connected activities"
                  className="hidden md:block w-full h-auto rounded-lg"
                  width={1600}
                  height={1000}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Embed or deploy */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              Embed or deploy — your choice.
            </h2>
            <p className="text-muted-foreground text-lg">
              Elsa fits two adoption models. Both are open source and MIT-licensed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardContent className="p-6 md:p-8 flex flex-col h-full">
                <h3 className="text-xl font-semibold mb-2">Embed Elsa</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Integrate Elsa libraries into a custom .NET application while
                  keeping control over hosting, persistence, authentication, UI,
                  and domain integrations.
                </p>
                <pre className="flex-1 text-xs md:text-[13px] leading-relaxed rounded-lg bg-muted/60 border border-border p-4 overflow-x-auto font-mono">
                  <code>{embedSnippet}</code>
                </pre>
                <div className="mt-5">
                  <Button variant="ghost" size="sm" className="gap-1.5 px-0 hover:bg-transparent" asChild>
                    <Link to="/get-started">
                      Get started with embedding
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-6 md:p-8 flex flex-col h-full">
                <h3 className="text-xl font-semibold mb-2">Deploy Elsa</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Run Elsa Server and Studio as a separately deployed workflow
                  system using open-source templates or the official Docker image.
                </p>
                <pre className="flex-1 text-xs md:text-[13px] leading-relaxed rounded-lg bg-muted/60 border border-border p-4 overflow-x-auto font-mono">
                  <code>{deploySnippet}</code>
                </pre>
                <div className="mt-5">
                  <Button variant="ghost" size="sm" className="gap-1.5 px-0 hover:bg-transparent" asChild>
                    <Link to="/get-started/docker">
                      Deploy with Docker
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. Build → Run → Operate */}
      <section className="py-16 md:py-24 border-y border-border/60 bg-surface-subtle">
        <div className="container">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary mb-3">
              Build → Run → Operate
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              One engine across the workflow lifecycle.
            </h2>
            <p className="text-muted-foreground text-lg">
              The same definition you author in C# or the visual designer runs on a
              durable runtime and stays observable through the Studio management UI.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {buildRunOperate.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-6">
                <div className="h-10 w-10 rounded-md border border-border flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Architecture credibility */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                Built to fit your architecture.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Elsa is a .NET library first. You choose the persistence store, the
                hosting model, the identity provider, and how workflows integrate
                with the rest of your system.
              </p>
            </div>
            <dl className="space-y-6">
              <div>
                <dt className="font-medium mb-1">You own the deployment</dt>
                <dd className="text-sm text-muted-foreground">
                  Run inside an existing ASP.NET Core app or as a dedicated Server + Studio host.
                </dd>
              </div>
              <div>
                <dt className="font-medium mb-1">Pluggable persistence</dt>
                <dd className="text-sm text-muted-foreground">
                  Entity Framework Core providers for SQL Server, PostgreSQL, SQLite, and MySQL. Swap the store without touching workflow code.
                </dd>
              </div>
              <div>
                <dt className="font-medium mb-1">Extension points at every layer</dt>
                <dd className="text-sm text-muted-foreground">
                  Custom activities, expression providers, endpoints, stores, Studio modules, and authentication providers.
                </dd>
              </div>
              <div>
                <dt className="font-medium mb-1">Observable execution</dt>
                <dd className="text-sm text-muted-foreground">
                  Execution history, structured logs, and workflow-instance inspection through the API and Studio.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* 5. Developer experience & use cases */}
      <section className="py-16 md:py-24 bg-surface-subtle border-y border-border/60">
        <div className="container">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              Real workflows, real code.
            </h2>
            <p className="text-muted-foreground text-lg">
              Elsa is used to build durable business processes, integrations, and
              event-driven systems on top of the .NET stack.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((uc) => (
              <div key={uc.title} className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-2">{uc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/features">
                Explore all features
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 6. Mission & open source */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary mb-3">
              Our mission
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-6">
              We empower .NET teams to build, run, and operate resilient,
              observable workflow automation with confidence.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Workflow automation should be a natural part of a team's applications,
              architecture, deployment practices, and operational tooling. Elsa gives
              developers the flexibility to embed workflow capabilities inside their
              software or deploy them as a standalone system — without surrendering
              control over infrastructure or application design.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Elsa Workflows is MIT-licensed, developed openly on GitHub, and
              vendor-neutral. Every layer has extension points; nothing is locked
              behind a paid tier.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" asChild>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
              <Button variant="ghost" className="gap-2" asChild>
                <Link to="/roadmap">
                  View the roadmap
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Community */}
      <section className="py-16 md:py-24 border-y border-border/60 bg-surface-subtle">
        <div className="container">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              Community and updates
            </h2>
            <p className="text-muted-foreground text-lg">
              Follow releases, browse the roadmap, and talk to other Elsa developers.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {communityLinks.map((link) => {
              const inner = (
                <div className="h-full rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors">
                  <link.icon className="h-5 w-5 text-primary mb-3" />
                  <div className="flex items-center gap-1.5 font-medium">
                    {link.title}
                    {link.href && <ExternalLink className="h-3 w-3 opacity-60" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                </div>
              );
              return link.to ? (
                <Link key={link.title} to={link.to} className="block h-full">
                  {inner}
                </Link>
              ) : (
                <a key={link.title} href={link.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Elsa+ disclosure + final CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <div className="rounded-xl border border-border bg-card p-6 md:p-7 mb-10">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <Link to="/elsa-plus" className="text-foreground font-medium hover:text-primary transition-colors">Elsa+</Link>{" "}
                lists optional provider-backed products and services around Elsa
                Workflows — including Early Preview Docker images from Valence
                Works, expert services, training, and more. Elsa Workflows itself
                remains open source and vendor-neutral.
              </p>
            </div>

            <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Ready to build?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Install Elsa in a new or existing .NET project in a few minutes.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/get-started">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4" />
                  Read the docs
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
