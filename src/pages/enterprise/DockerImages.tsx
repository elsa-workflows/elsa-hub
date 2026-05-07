import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NeutralityDisclaimer } from "@/components/enterprise";
import { CodeBlock, PrerequisitesBox } from "@/components/get-started";
import {
  Container,
  Layers,
  Package,
  ShieldCheck,
  Activity,
  HeartPulse,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

const features = [
  {
    icon: Container,
    title: "Workflow runtime + Studio",
    description:
      "Elsa 3.8 preview engine with HTTP triggers and JavaScript/Liquid expressions, paired with the Blazor Server Studio for visual design.",
  },
  {
    icon: Layers,
    title: "CShells multi-shell architecture",
    description:
      "Run multiple isolated workflow engines in a single host, each with its own features, persistence, and identity configuration.",
  },
  {
    icon: Package,
    title: "Nuplane runtime plugins",
    description:
      "Add database providers, message buses, schedulers, and more by configuring NuGet feeds and packages — no image rebuild required.",
  },
  {
    icon: ShieldCheck,
    title: "Identity & per-shell admin",
    description:
      "Built-in user management with role-based access control and per-shell admin provisioning via the DefaultAdminUser feature.",
  },
  {
    icon: Activity,
    title: "OpenTelemetry observability",
    description: "Metrics, distributed traces, and structured logging out of the box.",
  },
  {
    icon: HeartPulse,
    title: "Health endpoints",
    description: "/health and /alive endpoints for liveness and readiness probes in Kubernetes and other orchestrators.",
  },
];

const serverRunCommand = `docker run -d \\
  --network elsa \\
  -p 8080:8080 \\
  -e CShells__Shells__0__Features__DefaultAdminUser__AdminUsername=admin \\
  -e CShells__Shells__0__Features__DefaultAdminUser__AdminPassword=YourSecurePassword123! \\
  -e CShells__Shells__0__Features__Identity__SigningKey=replace-with-256-bit-key \\
  --name elsa-server \\
  valenceworks/elsa-pro-server:latest`;

const studioRunCommand = `docker run -d \\
  --network elsa \\
  -p 8081:8080 \\
  -e Backend__Url=http://elsa-server:8080/elsa/api \\
  --name elsa-studio \\
  valenceworks/elsa-pro-studio-blazorserver:latest`;

const composeFile = `services:
  elsa-server:
    image: valenceworks/elsa-pro-server:latest
    ports:
      - "8080:8080"
    environment:
      CShells__Shells__0__Features__DefaultAdminUser__AdminUsername: admin
      CShells__Shells__0__Features__DefaultAdminUser__AdminPassword: YourSecurePassword123!
      CShells__Shells__0__Features__Identity__SigningKey: replace-with-256-bit-key
    volumes:
      - ./config/elsa-server/config.json:/config/config.json
    networks: [elsa]

  elsa-studio:
    image: valenceworks/elsa-pro-studio-blazorserver:latest
    ports:
      - "8081:8080"
    environment:
      Backend__Url: http://elsa-server:8080/elsa/api
    volumes:
      - ./config/elsa-studio/config.json:/config/config.json
    depends_on: [elsa-server]
    networks: [elsa]

networks:
  elsa:`;

const adminFeatureJson = `{
  "CShells": {
    "Shells": {
      "Default": {
        "Features": {
          "DefaultAdminUser": {
            "AdminUsername": "admin",
            "AdminPassword": "YourSecurePassword123!",
            "AdminRoleName": "admin",
            "AdminRolePermissions": ["*"]
          },
          "Identity": {
            "SigningKey": "your-secure-256-bit-signing-key-here"
          }
        }
      }
    }
  }
}`;

const nuplaneJson = `{
  "CShells": {
    "Shells": {
      "Default": {
        "Features": {
          "PostgreSqlWorkflowPersistence": {
            "ConnectionString": "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa"
          },
          "PostgreSqlIdentityPersistence": {
            "ConnectionString": "Host=postgres;Port=5432;Database=elsa;Username=elsa;Password=elsa"
          }
        }
      }
    }
  }
}`;

const tags: Array<{ pattern: string; example: string; description: string }> = [
  { pattern: "latest", example: "latest", description: "Most recent build from main — always moving" },
  { pattern: "<version>-preview.<build>", example: "1.0.0-preview.42", description: "Preview build from main, auto-increments per push" },
  { pattern: "<version>", example: "1.0.0", description: "Stable release (from a git tag)" },
  { pattern: "<major>.<minor>", example: "1.0", description: "Latest patch within a minor version" },
  { pattern: "<major>", example: "1", description: "Latest minor+patch within a major version" },
  { pattern: "elsa-<elsa-version>", example: "elsa-3.8.0-preview.4538", description: "Latest build targeting a specific Elsa version" },
  { pattern: "sha-<commit>", example: "sha-07169a7", description: "Pinned to an exact commit" },
];

const roadmap = [
  "Hardened security defaults & container scanning",
  "Multi-tenancy support",
  "AI-assisted workflow development",
  "Enterprise integrations (SAP, Salesforce, …)",
  "High-availability deployment templates",
  "Reverse proxy configuration templates (nginx, Traefik)",
];

const links = [
  { label: "valenceworks/elsa-pro-server on Docker Hub", href: "https://hub.docker.com/r/valenceworks/elsa-pro-server" },
  { label: "valenceworks/elsa-pro-studio-blazorserver on Docker Hub", href: "https://hub.docker.com/r/valenceworks/elsa-pro-studio-blazorserver" },
  { label: "Source repository — valence-works/elsa-pro-docker", href: "https://github.com/valence-works/elsa-pro-docker" },
  { label: "Issues — bug reports and feature requests", href: "https://github.com/valence-works/elsa-pro-docker/issues" },
  { label: "Discussions — questions and community help", href: "https://github.com/valence-works/elsa-pro-docker/discussions" },
];

export default function DockerImages() {
  return (
    <Layout>
      {/* Breadcrumb */}
      <section className="pt-8 pb-4">
        <div className="container">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus">Elsa+</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Production Docker Images</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <Badge variant="secondary">Provided by Valence Works</Badge>
              <Badge variant="outline">Early Preview</Badge>
              <Badge variant="outline">Free to try</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Production Docker Images</h1>
            <p className="text-xl text-muted-foreground">
              Production-oriented Elsa containers built on .NET 10 with Elsa 3.8 preview. Configure with a mounted{" "}
              <code className="font-mono text-base bg-muted px-1.5 py-0.5 rounded">config.json</code>, load NuGet
              packages at runtime via Nuplane, and compose features per shell with CShells.
            </p>
          </div>
        </div>
      </section>

      {/* What's in the box */}
      <section className="py-16 md:py-20">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold mb-10 text-center">What's in the box</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start — docker run */}
      <section className="py-12 bg-surface-subtle">
        <div className="container max-w-4xl space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-3">Quick start with <code className="font-mono">docker run</code></h2>
            <p className="text-muted-foreground">
              Two containers — server and Studio — sharing a Docker network so Studio can reach the server by name.
            </p>
          </div>

          <PrerequisitesBox
            items={[
              "Docker 20.10 or later",
              "Free local ports 8080 (server) and 8081 (Studio)",
            ]}
          />

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Create a shared network</h3>
              <CodeBlock code="docker network create elsa" language="bash" />
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Run Elsa Pro Server</h3>
              <CodeBlock code={serverRunCommand} language="bash" title="Elsa Pro Server" />
              <p className="text-sm text-muted-foreground mt-2">
                Server: <a className="text-primary hover:underline" href="http://localhost:8080" target="_blank" rel="noopener noreferrer">http://localhost:8080</a>
                {" · "}Health: <a className="text-primary hover:underline" href="http://localhost:8080/health" target="_blank" rel="noopener noreferrer">http://localhost:8080/health</a>
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Run Elsa Pro Studio</h3>
              <CodeBlock code={studioRunCommand} language="bash" title="Elsa Pro Studio (Blazor Server)" />
              <p className="text-sm text-muted-foreground mt-2">
                Studio reaches the server by container name on the Docker network. Open Studio at{" "}
                <a className="text-primary hover:underline" href="http://localhost:8081" target="_blank" rel="noopener noreferrer">http://localhost:8081</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start — Docker Compose */}
      <section className="py-12">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Quick start with Docker Compose</h2>
          <p className="text-muted-foreground">
            Easier to manage than two <code className="font-mono">docker run</code> commands — both services on one
            network, with config files mounted from disk.
          </p>
          <CodeBlock code={composeFile} language="yaml" title="docker-compose.yml" />
          <CodeBlock code="docker compose up -d" language="bash" />
          <p className="text-sm text-muted-foreground">
            Then open Studio at{" "}
            <a className="text-primary hover:underline" href="http://localhost:8081" target="_blank" rel="noopener noreferrer">http://localhost:8081</a>.
          </p>
        </div>
      </section>

      {/* Configuration via mounted config.json */}
      <section className="py-12 bg-surface-subtle">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Configuration via mounted <code className="font-mono">config.json</code></h2>
          <p className="text-muted-foreground">
            Both services load an optional JSON file from <code className="font-mono">/config/config.json</code> inside
            the container. This avoids long lists of <code className="font-mono">-e</code> flags and keeps secrets out
            of the process environment.
          </p>
          <div className="rounded-lg border bg-card p-5">
            <p className="font-medium mb-2">Configuration precedence (last wins):</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
              <li><code className="font-mono">appsettings.json</code> (baked into the image)</li>
              <li><code className="font-mono">appsettings.{"{Environment}"}.json</code> (baked into the image)</li>
              <li><code className="font-mono">/config/config.json</code> (your mount)</li>
              <li>Environment variables (highest precedence)</li>
            </ol>
          </div>
          <CodeBlock
            code="docker run ... -v $(pwd)/config.json:/config/config.json valenceworks/elsa-pro-server:latest"
            language="bash"
            title="Mount your config file"
          />
          <p className="text-sm text-muted-foreground">
            An annotated <code className="font-mono">config.example.json</code> ships in the source repository — copy it,
            remove the comments, and mount it as above.
          </p>
        </div>
      </section>

      {/* Per-shell admin & identity */}
      <section className="py-12">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Per-shell admin & identity (CShells)</h2>
          <p className="text-muted-foreground">
            Admin users and identity are configured per shell. The default shell uses the{" "}
            <code className="font-mono">DefaultAdminUser</code> feature:
          </p>
          <CodeBlock code={adminFeatureJson} language="json" title="config.json — default shell admin" />
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Set a real signing key in production.</strong> Generate a secure 256-bit value for{" "}
              <code className="font-mono">Identity.SigningKey</code>. Never ship the placeholder.
            </p>
          </div>
        </div>
      </section>

      {/* Extending via Nuplane */}
      <section className="py-12 bg-surface-subtle">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Extending via Nuplane</h2>
          <p className="text-muted-foreground">
            Configure a NuGet feed and a list of packages in your <code className="font-mono">config.json</code>, and
            Nuplane downloads and loads them on startup. Capabilities such as PostgreSQL, SQL Server, RabbitMQ, Azure
            Service Bus, and Quartz scheduling are then enabled per shell through CShells features. The catalog of
            feeds and packages will be documented separately.
          </p>
          <CodeBlock code={nuplaneJson} language="json" title="config.json — PostgreSQL persistence example" />
        </div>
      </section>

      {/* Image tags */}
      <section className="py-12">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Image tags</h2>
          <p className="text-muted-foreground">
            Each image is published with multiple tags so you can pin to the level of stability you need.
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Tag pattern</th>
                  <th className="text-left px-4 py-2 font-medium">Example</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t) => (
                  <tr key={t.pattern} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{t.pattern}</td>
                    <td className="px-4 py-2 font-mono text-xs">{t.example}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Image</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">valenceworks/elsa-pro-server</td>
                  <td className="px-4 py-2 text-muted-foreground">Elsa Pro API server</td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">valenceworks/elsa-pro-studio-blazorserver</td>
                  <td className="px-4 py-2 text-muted-foreground">Elsa Pro Studio (Blazor Server)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-12 bg-surface-subtle">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Roadmap</h2>
          <p className="text-muted-foreground">Planned, not yet available:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {roadmap.map((item) => (
              <li key={item} className="rounded-md border bg-card px-4 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Resources */}
      <section className="py-12">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Resources</h2>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  {l.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Neutrality Disclaimer */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
