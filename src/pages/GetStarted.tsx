import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Server,
  Layout as LayoutIcon,
  Layers,
  BookOpen,
  Github,
  Package,
  Play,
  ArrowRight,
  Container,
  Code2,
} from "lucide-react";
import { GuideCard, PathCard, CodeBlock } from "@/components/get-started";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Badge } from "@/components/ui/badge";
import {
  ELSA_VERSION,
  ELSA_RELEASE_DATE,
  ELSA_RELEASE_LINKS,
  ELSA_TEMPLATES_VERSION,
  ELSA_TEMPLATES_RELEASE_URL,
  ELSA_TEMPLATES_PR_URL,
  ELSA_TEMPLATES_TARGET_FRAMEWORK,
  ELSA_TEMPLATES_CSHELLS_VERSION,
  ELSA_UPGRADE_GUIDE_URL,
} from "@/data/elsaVersion";



const paths = [
  {
    icon: Container,
    title: "Try with Docker",
    subtitle: "Explore Elsa in minutes",
    description:
      "Run pre-built containers to experience the workflow engine and visual designer. No development environment required.",
    bestFor: ["Evaluating features", "Quick demonstrations", "First-time exploration"],
    href: "/get-started/docker",
    cta: "Launch Containers",
  },
  {
    icon: Package,
    title: "Use a Template",
    subtitle: "Scaffold with dotnet new",
    description:
      "Generate a ready-to-run Elsa solution from the official .NET templates. Pick Server, Studio, or a combined solution and choose persistence, hosting, and auth.",
    bestFor: ["Fastest .NET start", "Production-shaped layout", "Consistent project structure"],
    href: "#templates",
    cta: "See Templates",
    badge: "New",
  },
  {
    icon: Code2,
    title: "Build Your Own",
    subtitle: "Create a custom solution",
    description: "Set up Elsa in your own ASP.NET Core project with full control over configuration and deployment.",
    bestFor: ["Production applications", "Custom integrations", "Full flexibility"],
    href: "#build-your-own",
    cta: "Choose Setup",
  },
];


const guides = [
  {
    icon: Server,
    title: "Elsa Server",
    description:
      "Build a workflow engine backend with REST APIs. Ideal when you need a headless workflow service or want to use your own frontend.",
    bestFor: ["API-first architectures", "Microservices", "Custom frontends"],
    href: "/get-started/elsa-server",
  },
  {
    icon: LayoutIcon,
    title: "Elsa Studio",
    description:
      "Set up the visual workflow designer. Connects to an existing Elsa Server to provide a complete management UI.",
    bestFor: ["Separate backend and frontend", "Existing Elsa Server users", "Custom branding needs"],
    href: "/get-started/elsa-studio",
  },
  {
    icon: Layers,
    title: "Elsa Server + Studio",
    description:
      "Create a single application that runs both the workflow engine and designer together. The quickest path to a complete solution.",
    bestFor: ["Getting started quickly", "Demos and prototypes", "Small to medium deployments"],
    href: "/get-started/elsa-server-and-studio",
    badge: "Recommended",
  },
];

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Comprehensive guides and API reference",
    href: "https://docs.elsaworkflows.io/",
    cta: "Read Docs",
  },
  {
    icon: Github,
    title: "GitHub Repository",
    description: "Source code, issues, and contributions",
    href: "https://github.com/elsa-workflows/elsa-core",
    cta: "View Source",
  },
  {
    icon: Package,
    title: "NuGet Packages",
    description: "All available Elsa packages",
    href: "https://www.nuget.org/packages?q=elsa&includeComputedFrameworks=true&prerel=true",
    cta: "Browse Packages",
  },
  {
    icon: Play,
    title: "Sample Projects",
    description: "Example implementations and demos",
    href: "https://github.com/elsa-workflows/elsa-samples",
    cta: "View Samples",
  },
];

export default function GetStarted() {
  return (
    <Layout>
      <Seo path="/get-started" title={`Get started with Elsa Workflows ${ELSA_VERSION}`} description={`Setup guides for Elsa Workflows ${ELSA_VERSION}: Elsa Server, Elsa Studio, a combined host, or Docker — plus the ${ELSA_VERSION} upgrade notes.`} />
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Get Started with Elsa</h1>
            <p className="text-xl text-muted-foreground">
              Whether you want to explore Elsa quickly or build a production solution, we have you covered.
            </p>
          </div>
        </div>
      </section>

      {/* Latest release */}
      <section id="latest-release" className="py-10 md:py-12 border-y border-border/60 scroll-mt-20">
        <div className="container">
          <div className="max-w-4xl rounded-lg border bg-card p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-2xl font-bold">Latest stable release: Elsa {ELSA_VERSION}</h2>
              <Badge variant="secondary" className="font-mono">{ELSA_RELEASE_DATE}</Badge>
            </div>
            <p className="text-muted-foreground mb-5">
              Elsa {ELSA_VERSION} adds opt-in diagnostics (structured logs, console logs, OpenTelemetry),
              runtime operations such as drain and pause/resume, a Secrets module, external
              authentication, the StateMachine activity, a Dashboard API, and the Weaver AI host.
              Elsa Studio {ELSA_VERSION} adds a dashboard shell, a diagnostics workspace, a React Flow
              sequence designer, and a rebuilt state-machine designer. These modules are separate
              packages: existing hosts do not opt into them automatically.
            </p>

            <h3 className="font-semibold mb-2 text-sm">Before you upgrade</h3>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1.5 mb-5">
              <li>
                <strong className="text-foreground">Identity secrets are required.</strong> The reference
                server no longer ships usable admin credentials or API keys. Configure the initial
                user/application yourself, and set a JWT signing key of at least 32 printable ASCII
                characters with no surrounding whitespace (
                <code className="font-mono">Identity__Tokens__SigningKey</code>). Known public defaults are
                accepted only in <code className="font-mono">Development</code> or{" "}
                <code className="font-mono">Demo</code>.
              </li>
              <li>
                <strong className="text-foreground">Localhost bootstrap is opt-in.</strong> Localhost requests
                no longer receive security-root permissions unless the host calls{" "}
                <code className="font-mono">EnableLocalHostPermissionGrantForSecurityRoot()</code>.
              </li>
              <li>
                <strong className="text-foreground">Script execution is privileged.</strong> C# and Python
                expressions require <code className="font-mono">AllowHostCodeExecution</code> plus the{" "}
                <code className="font-mono">exec:csharp-expressions</code> /{" "}
                <code className="font-mono">exec:python-expressions</code> permission. They run host code and
                are not sandboxes.
              </li>
              <li>
                <strong className="text-foreground">Studio picks exactly one auth provider.</strong> Legacy
                Elsa.Studio.Login, Elsa Identity, direct OIDC and brokered External Authentication must not be
                mixed, and Studio {ELSA_VERSION} consumes Elsa.Api.Client {ELSA_VERSION} — upgrade Core first.
              </li>
              <li>
                <strong className="text-foreground">.NET 10 package set</strong> moves FastEndpoints to 8.2.0;
                new Secrets and external-authentication EF Core packages add provider migrations.
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <a href={ELSA_RELEASE_LINKS.core} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all">
                <Github className="h-4 w-4" /> Elsa Core {ELSA_VERSION} release notes <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-muted-foreground">·</span>
              <a href={ELSA_RELEASE_LINKS.studio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all">
                <Github className="h-4 w-4" /> Elsa Studio {ELSA_VERSION} <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-muted-foreground">·</span>
              <a href={ELSA_RELEASE_LINKS.extensions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all">
                <Github className="h-4 w-4" /> Elsa Extensions {ELSA_VERSION} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* Choose Your Path */}
      <section className="py-16 md:py-20">
        <div className="container">
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Choose Your Path</h2>
              <p className="text-muted-foreground max-w-2xl">
                Just want to explore? Try our Docker containers. Want the fastest .NET start? Use a template. Need full control? Build your own.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paths.map((path, index) => (
              <ScrollReveal key={path.title} delay={index * 100}>
                <PathCard {...path} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="py-16 md:py-20 bg-surface-subtle scroll-mt-20">
        <div className="container">
          <ScrollReveal>
            <div className="mb-10 max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold">Scaffold with .NET Templates</h2>
                <Badge variant="secondary">New</Badge>
              </div>
              <p className="text-muted-foreground">
                The <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted border">Elsa.Templates</code> package
                ships official <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted border">dotnet new</code> templates
                for Elsa Server, Elsa Studio, and a combined solution. The{" "}
                <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted border">{ELSA_TEMPLATES_VERSION}</code>{" "}
                templates reference Elsa Core and Elsa Studio at {ELSA_VERSION}, CShells{" "}
                <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted border">{ELSA_TEMPLATES_CSHELLS_VERSION}</code>,
                and generate <strong>.NET 10</strong> (
                <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-muted border">{ELSA_TEMPLATES_TARGET_FRAMEWORK}</code>)
                projects — so no manual package bump is needed after scaffolding.
              </p>
              <p className="text-sm text-muted-foreground mt-4 rounded-md border border-border/70 bg-background p-4">
                <strong className="text-foreground">Release status:</strong> the {ELSA_TEMPLATES_VERSION} template
                package is tagged — see{" "}
                <a href={ELSA_TEMPLATES_RELEASE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                  the 3.8.0 release
                </a>.
              </p>

            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
            <ScrollReveal>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">1. Install the templates</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Template package version — independent of the Elsa runtime version, though{" "}
                    {ELSA_TEMPLATES_VERSION} lines up with the {ELSA_VERSION} runtime.
                  </p>
                  <CodeBlock language="bash" code={`dotnet new install Elsa.Templates@${ELSA_TEMPLATES_VERSION}`} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Sign in to the generated app</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generated <code className="font-mono px-1 py-0.5 rounded bg-muted border">Development</code>{" "}
                    settings include a sample administrator:{" "}
                    <code className="font-mono px-1 py-0.5 rounded bg-muted border">admin</code> /{" "}
                    <code className="font-mono px-1 py-0.5 rounded bg-muted border">password</code>. Outside
                    Development there are no built-in credentials — the identity source, administrator bootstrap
                    and JWT signing key are deployment-owned settings you must provide yourself.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Migrating an existing solution instead of scaffolding a new one? Follow the{" "}
                    <a href={ELSA_UPGRADE_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                      upgrade guide for {ELSA_VERSION}
                    </a>. Older template packages (3.7.0 / 3.7.1) generated Elsa 3.7.0 references and required a
                    manual package bump; that workaround is no longer the recommended path.
                  </p>
                </div>
              </div>
            </ScrollReveal>



            <ScrollReveal delay={100}>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">2. Create a project</h3>
                  <p className="text-sm text-muted-foreground mb-3">Pick the template that fits your setup.</p>
                  <CodeBlock
                    language="bash"
                    title="Elsa Server + Studio (recommended)"
                    code={`dotnet new elsa-combined -n MyElsaApp \\
  --feature-model static \\
  --studio-hosting server`}
                  />
                </div>
                <CodeBlock
                  language="bash"
                  title="Elsa Server only"
                  code={`dotnet new elsa-server -n MyElsaServer \\
  --feature-model static \\
  --persistence sqlite`}
                />
                <CodeBlock
                  language="bash"
                  title="Elsa Studio only"
                  code={`dotnet new elsa-studio -n MyElsaStudio \\
  --hosting server \\
  --auth-provider elsa-identity`}
                />
              </div>
            </ScrollReveal>
          </div>


          <ScrollReveal delay={200}>
            <div className="mt-10 grid md:grid-cols-3 gap-4 max-w-5xl">
              <div className="rounded-lg border bg-background p-5">
                <h4 className="font-semibold mb-2 text-sm">Feature model</h4>
                <p className="text-xs text-muted-foreground">
                  <code className="font-mono">--feature-model static</code> for compile-time registration, or{" "}
                  <code className="font-mono">shell</code> for runtime CShells.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-5">
                <h4 className="font-semibold mb-2 text-sm">Persistence</h4>
                <p className="text-xs text-muted-foreground">
                  EF Core providers: <code className="font-mono">sqlite</code>,{" "}
                  <code className="font-mono">sqlserver</code>, <code className="font-mono">postgresql</code>,{" "}
                  <code className="font-mono">oracle</code>.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-5">
                <h4 className="font-semibold mb-2 text-sm">Studio hosting, auth &amp; modules</h4>
                <p className="text-xs text-muted-foreground">
                  Hosting: <code className="font-mono">server</code>, <code className="font-mono">wasm</code>,{" "}
                  <code className="font-mono">hybrid</code>. Auth: <code className="font-mono">elsa-identity</code>,{" "}
                  <code className="font-mono">open-id-connect</code>, <code className="font-mono">elsa-login</code>. Add{" "}
                  <code className="font-mono">--with-labels</code> for the Labels module. Hybrid output adds a WASM
                  client and reads <code className="font-mono">Studio:HostingModel</code> at runtime; a routing
                  correction for that mode is still being finished before the tag.
                </p>
              </div>

            </div>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <a
                href="https://github.com/elsa-workflows/elsa-templates"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all"
              >
                <Github className="h-4 w-4" />
                elsa-workflows/elsa-templates
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="text-muted-foreground">·</span>
              <a
                href="https://www.nuget.org/packages/Elsa.Templates"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-primary hover:gap-3 transition-all"
              >
                <Package className="h-4 w-4" />
                Elsa.Templates on NuGet
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* Build Your Own - Guide Cards */}
      <section id="build-your-own" className="py-16 md:py-20 bg-surface-subtle scroll-mt-20">
        <div className="container">
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Build Your Own</h2>
              <p className="text-muted-foreground max-w-2xl">
                Elsa Workflows offers flexible deployment options. Select the setup that matches your architecture.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guides.map((guide, index) => (
              <ScrollReveal key={guide.title} delay={index * 100}>
                <GuideCard {...guide} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 md:py-24">
        <div className="container">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Resources & Documentation</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to master Elsa Workflows.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => (
              <ScrollReveal key={resource.title} delay={index * 100}>
                <a href={resource.href} target="_blank" rel="noopener noreferrer" className="group block h-full">
                  <Card className="h-full hover:border-primary/50 transition-all hover:shadow-lg">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                        <resource.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{resource.description}</p>
                      <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        {resource.cta}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
