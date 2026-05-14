import { Seo } from "@/components/Seo";
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
import { getDockerImage, dockerImages } from "@/data/dockerImages";
import { renderInlineCode } from "@/lib/renderInlineCode";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DockerImageDetail() {
  const { slug } = useParams<{ slug: string }>();
  const image = slug ? getDockerImage(slug) : undefined;

  if (!image) {
    return <Navigate to="/elsa-plus/docker-images" replace />;
  }

  const Icon = image.icon;
  const serverImage = image.requiresServer
    ? dockerImages.find((i) => i.slug === "elsa-pro-server")
    : undefined;

  const composeFile = `services:
${serverImage ? serverImage.composeService + "\n" : ""}${image.composeService}

networks:
  elsa:`;

  return (
    <Layout>
      <Seo
        path={`/elsa-plus/docker-images/${image.slug}`}
        title={`${image.name} Docker image — Elsa+`}
        description={`${image.name} (${image.image}): production-ready Elsa container. Configuration, environment variables, docker run and Docker Compose snippets.`}
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

      {/* Requires-server alert */}
      {image.requiresServer && serverImage && (
        <section className="pt-4">
          <div className="container max-w-4xl">
            <Alert className="border-warning/40 bg-warning/5">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertTitle>Requires a running Elsa Pro Server</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Studio is a UI only — it cannot execute or persist workflows on its own. You need a reachable{" "}
                <Link to="/elsa-plus/docker-images/elsa-pro-server" className="text-primary hover:underline">
                  Elsa Pro Server
                </Link>{" "}
                (or the all-in-one{" "}
                <Link to="/elsa-plus/docker-images/elsa-pro-combined" className="text-primary hover:underline">
                  Elsa Pro Combined
                </Link>{" "}
                image) before Studio is useful. Sample commands for running the server are included below.
              </AlertDescription>
            </Alert>
          </div>
        </section>
      )}

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
              ...(image.requiresServer ? ["A running Elsa Pro Server reachable from this container"] : []),
            ]}
          />

          {image.needsSharedNetwork && (
            <div>
              <h3 className="font-semibold mb-2">1. Create the shared network (skip if it already exists)</h3>
              <CodeBlock code="docker network create elsa" language="bash" />
            </div>
          )}

          {serverImage && (
            <div>
              <h3 className="font-semibold mb-2">
                {image.needsSharedNetwork ? "2." : "1."} Run an Elsa Pro Server (skip if you already have one)
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Studio will connect to this container. If you already have a server running, skip ahead.
              </p>
              <CodeBlock code={serverImage.runCommand} language="bash" title={serverImage.name} />
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">
              {(() => {
                const stepNum = 1 + (image.needsSharedNetwork ? 1 : 0) + (serverImage ? 1 : 0);
                return `${stepNum}. Run the ${image.name} container`;
              })()}
            </h3>
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

          {image.fullStackComposeFile && (
            <div className="pt-6 space-y-3">
              <h3 className="text-2xl font-bold">Full stack with PostgreSQL and RabbitMQ</h3>
              <p className="text-muted-foreground">
                A more complete example that provisions PostgreSQL (for persistence) and RabbitMQ (for messaging
                and scheduling) alongside {image.name}. The Elsa container waits for both services to report healthy
                before starting, and receives connection strings via environment variables that you can reference
                from your <code className="font-mono">config.json</code>.
              </p>
              <CodeBlock
                code={image.fullStackComposeFile}
                language="yaml"
                title="docker-compose.full-stack.yml"
              />
              <p className="text-sm text-muted-foreground">
                Update your <code className="font-mono">config.json</code> to enable the PostgreSQL and RabbitMQ
                features per shell (see Nuplane and CShells configuration below) and reference the injected{" "}
                <code className="font-mono">ConnectionStrings__Postgres</code> and{" "}
                <code className="font-mono">ConnectionStrings__RabbitMq</code> values.
              </p>
            </div>
          )}
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
