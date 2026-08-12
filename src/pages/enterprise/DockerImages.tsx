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
import { CodeBlock } from "@/components/get-started";
import { dockerImages, internalSmokeTestImage } from "@/data/dockerImages";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { ArrowRight, Boxes, ExternalLink, Lock } from "lucide-react";

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
  { label: "Documentation & issue tracking", href: "https://github.com/valence-works/runtime" },
  { label: "Setup and configuration guide", href: "https://github.com/valence-works/runtime/wiki" },
];

export default function DockerImages() {
  const { data: isPlatformAdmin } = useIsAdmin();

  return (
    <Layout>
      <Seo
        path="/elsa-plus/valence-runtime/images"
        title="Valence Runtime — production Elsa container images"
        description="Early Preview Elsa container images provided by Valence Works: server, studio, and combined, built on .NET 10 with Elsa 3.8 preview. Published to a private registry — access on request."
      />
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
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus/valence-runtime">Valence Runtime</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Images</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <Badge variant="secondary">Provided by Valence Works</Badge>
              <Badge variant="outline">Early Preview</Badge>
              <Badge variant="outline">Private registry (ghcr.io)</Badge>
              <Badge variant="outline">Access on request</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Valence Runtime — production Elsa container images
            </h1>
            <p className="text-xl text-muted-foreground">
              Early Preview Elsa containers built on .NET 10 with Elsa 3.8 preview. Configure with a mounted{" "}
              <code className="font-mono text-base bg-muted px-1.5 py-0.5 rounded">config.json</code>, load NuGet
              packages at runtime via Nuplane, and compose features per shell with CShells. Not yet a supported
              distribution — production hardening, container scanning, and stable release guarantees are on the roadmap.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/elsa-plus/valence-runtime">Request access</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href="https://github.com/valence-works/runtime" target="_blank" rel="noopener noreferrer">
                  Documentation &amp; issue tracking
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-3">Available images</h2>
            <p className="text-muted-foreground">
              Pick an image to see prerequisites, environment variables, <code className="font-mono">docker run</code>{" "}
              and Docker Compose snippets, and configuration details.
            </p>
          </div>

          <div className="mb-10 rounded-xl border bg-card p-5 md:p-6 flex gap-4">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Valence Runtime images are published to a private registry. During Early Preview, access is granted on
                request. Previously published images on Docker Hub are no longer updated.
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Registry:</span> GitHub Container Registry (ghcr.io) —
                private · <span className="font-medium text-foreground">Access:</span> Early Preview — request access
              </p>
              <CodeBlock
                code={`echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker pull ghcr.io/valence-works/runtime-server:3.8.0-preview.5413`}
                language="bash"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dockerImages.map((img) => (
              <DockerImageCard key={img.slug} image={img} />
            ))}

            {isPlatformAdmin === true && (
              <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-6 flex flex-col h-full">
                <Badge variant="destructive" className="w-fit mb-3">
                  Internal — not for sale
                </Badge>
                <h3 className="text-lg font-semibold leading-tight">{internalSmokeTestImage.name}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                  {internalSmokeTestImage.image}
                </p>
                <p className="text-sm text-muted-foreground mt-4">{internalSmokeTestImage.tagline}</p>
                <p className="text-xs text-muted-foreground mt-auto pt-4">
                  Visible to platform admins only. Placeholder for the €1 webhook smoke-test product.
                </p>
              </div>
            )}
          </div>

          {/* Runtime Builder CTA */}
          <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
            <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Boxes className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">Not sure which image you need?</h3>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Preview
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Compose your runtime visually — pick an image, enable capabilities, and preview a complete Docker deployment bundle. Concept build on sample data.
              </p>
            </div>
            <Button asChild className="gap-2 shrink-0">
              <Link to="/elsa-plus/runtime-builder">
                Open Runtime Builder
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Licensing */}
      <section className="py-12">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Licensing</h2>
          <p className="text-muted-foreground leading-relaxed">
            Elsa Workflows itself is open source under the MIT License and always will be. The Valence Runtime
            container images and their packaging are licensed commercially and require a subscription.
          </p>
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
