import { Link, Navigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CodeBlock, PrerequisitesBox } from "@/components/get-started";
import {
  ConfigJsonExplainer,
  PerShellAdminExplainer,
  NuplaneExplainer,
  ImageTagsTable,
} from "@/components/docker-images";
import { NeutralityDisclaimer } from "@/components/enterprise";
import { getDockerImage } from "@/data/dockerImages";
import { renderInlineCode } from "@/lib/renderInlineCode";
import { ExternalLink } from "lucide-react";

export default function DockerImageDetail() {
  const { slug } = useParams<{ slug: string }>();
  const image = slug ? getDockerImage(slug) : undefined;

  if (!image) {
    return <Navigate to="/elsa-plus/docker-images" replace />;
  }

  const Icon = image.icon;
  const composeFile = `services:
${image.composeService}

networks:
  elsa:`;

  return (
    <Layout>
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
                  <Link to="/elsa-plus/docker-images">Docker Images</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{image.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-10 md:py-14 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container max-w-4xl">
          <div className="flex items-start gap-5 mb-6">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{image.name}</h1>
              <p className="text-sm font-mono text-muted-foreground mb-3">{image.image}</p>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">{renderInlineCode(image.description)}</p>
          <div className="mt-5">
            <Button asChild variant="outline" className="gap-2">
              <a href={image.dockerHubUrl} target="_blank" rel="noopener noreferrer">
                View on Docker Hub
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Start — docker run */}
      <section className="py-10">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">
            Quick start with <code className="font-mono">docker run</code>
          </h2>

          <PrerequisitesBox
            items={[
              "Docker 20.10 or later",
              `Free local port ${image.hostPort}`,
              ...(image.needsSharedNetwork ? ["A shared Docker network named 'elsa'"] : []),
            ]}
          />

          {image.needsSharedNetwork && (
            <div>
              <h3 className="font-semibold mb-2">1. Create the shared network (skip if it already exists)</h3>
              <CodeBlock code="docker network create elsa" language="bash" />
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">{image.needsSharedNetwork ? "2. Run the container" : "1. Run the container"}</h3>
            <CodeBlock code={image.runCommand} language="bash" title={image.name} />
            {(image.accessUrl || image.healthUrl) && (
              <p className="text-sm text-muted-foreground mt-2">
                {image.accessUrl && (
                  <>
                    Access:{" "}
                    <a className="text-primary hover:underline" href={image.accessUrl} target="_blank" rel="noopener noreferrer">
                      {image.accessUrl}
                    </a>
                  </>
                )}
                {image.accessUrl && image.healthUrl && " · "}
                {image.healthUrl && (
                  <>
                    Health:{" "}
                    <a className="text-primary hover:underline" href={image.healthUrl} target="_blank" rel="noopener noreferrer">
                      {image.healthUrl}
                    </a>
                  </>
                )}
              </p>
            )}
          </div>

          {image.notes && image.notes.length > 0 && (
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              {image.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick Start — Docker Compose */}
      <section className="py-10 bg-surface-subtle">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Quick start with Docker Compose</h2>
          <p className="text-muted-foreground">
            Drop this service into your <code className="font-mono">docker-compose.yml</code>. If you also run other
            Elsa Pro images, add their service blocks alongside this one and keep them on the same{" "}
            <code className="font-mono">elsa</code> network.
          </p>
          <CodeBlock code={composeFile} language="yaml" title="docker-compose.yml" />
          <CodeBlock code="docker compose up -d" language="bash" />
        </div>
      </section>

      {/* Environment variables */}
      {image.envVars.length > 0 && (
        <section className="py-10">
          <div className="container max-w-4xl space-y-4">
            <h2 className="text-3xl font-bold">Environment variables</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Variable</th>
                    <th className="text-left px-4 py-2 font-medium">Description</th>
                    <th className="text-left px-4 py-2 font-medium">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {image.envVars.map((v) => (
                    <tr key={v.key} className="border-t align-top">
                      <td className="px-4 py-2 font-mono text-xs break-all">{v.key}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {v.description}
                        {v.example && (
                          <>
                            {" "}
                            <span className="block mt-1 text-xs">
                              Example: <code className="font-mono">{v.example}</code>
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">{v.required ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Mounted config.json */}
      <section className="py-10 bg-surface-subtle">
        <div className="container max-w-4xl">
          <ConfigJsonExplainer image={image.image} />
        </div>
      </section>

      {/* Per-shell admin & identity */}
      {image.showPerShellAdmin && (
        <section className="py-10">
          <div className="container max-w-4xl">
            <PerShellAdminExplainer />
          </div>
        </section>
      )}

      {/* Nuplane */}
      {image.showNuplane && (
        <section className="py-10 bg-surface-subtle">
          <div className="container max-w-4xl">
            <NuplaneExplainer />
          </div>
        </section>
      )}

      {/* Image tags */}
      <section className="py-10">
        <div className="container max-w-4xl">
          <ImageTagsTable />
        </div>
      </section>

      {/* Resources */}
      <section className="py-10 bg-surface-subtle">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Resources</h2>
          <ul className="space-y-2">
            <li>
              <a
                href={image.dockerHubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                {image.image} on Docker Hub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/valence-works/elsa-pro-docker"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Source repository
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <Link to="/elsa-plus/docker-images" className="inline-flex items-center gap-2 text-primary hover:underline">
                ← Back to all Docker images
              </Link>
            </li>
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
