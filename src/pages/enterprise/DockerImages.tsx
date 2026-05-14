import { Seo } from "@/components/Seo";
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
import { DockerImageCard } from "@/components/docker-images";
import { dockerImages } from "@/data/dockerImages";
import { ExternalLink } from "lucide-react";

const roadmap = [
  "Observability (structured logs, console logs, OpenTelemetry)",
  "Webhooks",
  "Upload NuGet packages (custom code, activities, integrations)",
  "User tasks",
  "Hardened security defaults & container scanning",
  "Multi-tenancy support",
  "AI-assisted workflow development",
  "Enterprise integrations (SAP, Salesforce, …)",
  "High-availability deployment templates",
  "Reverse proxy configuration templates (nginx, Traefik)",
  "More…",
];

const links = [
  { label: "valenceworks on Docker Hub", href: "https://hub.docker.com/u/valenceworks" },
  { label: "Source repository — valence-works/elsa-pro-docker", href: "https://github.com/valence-works/elsa-pro-docker" },
  { label: "Issues — bug reports and feature requests", href: "https://github.com/valence-works/elsa-pro-docker/issues" },
  { label: "Discussions — questions and community help", href: "https://github.com/valence-works/elsa-pro-docker/discussions" },
];

export default function DockerImages() {
  return (
    <Layout>
      <Seo path="/elsa-plus/docker-images" title="Production Docker images for Elsa — Elsa+" description="Production-oriented Elsa containers from Valence Works: server, studio, and combined images on .NET 10 with Elsa 3.8 preview. Configure via mounted config.json and Nuplane." />
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
                <BreadcrumbPage>Docker Images</BreadcrumbPage>
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

      {/* Catalog */}
      <section className="py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3">Available images</h2>
            <p className="text-muted-foreground">
              Pick an image to see prerequisites, environment variables, <code className="font-mono">docker run</code>{" "}
              and Docker Compose snippets, and configuration details.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dockerImages.map((img) => (
              <DockerImageCard key={img.slug} image={img} />
            ))}
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

      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
