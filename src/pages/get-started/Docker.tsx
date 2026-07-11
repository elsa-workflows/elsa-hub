import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { GuideBreadcrumb, PrerequisitesBox, DockerSection } from "@/components/get-started";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, Boxes } from "lucide-react";
import {
  ELSA_DOCKER_PULL_COMMAND,
  ELSA_DOCKER_RUN_COMMAND,
} from "@/data/canonicalSamples";

const dockerOptions = [
  {
    title: "Elsa Server + Studio",
    description:
      "The complete package — both the workflow engine and visual designer in one container. Canonical quick-start from the release/3.7.0 branch.",
    pullCommand: ELSA_DOCKER_PULL_COMMAND,
    runCommand: ELSA_DOCKER_RUN_COMMAND,
    accessUrl: "http://localhost:13000",
    credentials: { username: "admin", password: "password" },
    badge: "Recommended",
  },
  {
    title: "Elsa Server",
    description:
      "The workflow engine with REST API. View API documentation via Swagger.",
    pullCommand: "docker pull elsaworkflows/elsa-server-v3-5:latest",
    runCommand: `docker run -t -i \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  -e HTTP_PORTS=8080 \\
  -e HTTP__BASEURL=http://localhost:13000 \\
  -p 13000:8080 \\
  elsaworkflows/elsa-server-v3-5:latest`,
    accessUrl: "http://localhost:13000",
    swaggerUrl: "http://localhost:13000/swagger",
  },
  {
    title: "Elsa Studio",
    description:
      "The visual workflow designer. Requires a running Elsa Server instance to connect to.",
    pullCommand: "docker pull elsaworkflows/elsa-studio-v3-5:latest",
    runCommand: `docker run -t -i \\
  -e ASPNETCORE_ENVIRONMENT='Development' \\
  -e HTTP_PORTS=8080 \\
  -e ELSASERVER__URL=http://localhost:13000/elsa/api \\
  -p 14000:8080 \\
  elsaworkflows/elsa-studio-v3-5:latest`,
    accessUrl: "http://localhost:14000",
    credentials: { username: "admin", password: "password" },
    note: (
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <span>
          <strong>Requires Elsa Server</strong> — Start the Elsa Server container
          first before running Studio.
        </span>
      </span>
    ),
  },
];

export default function Docker() {
  return (
    <Layout>
      <Seo path="/get-started/docker" title="Get started with Elsa on Docker" description="Run Elsa Workflows in containers: Docker setup for local development and production deployments." />
      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <GuideBreadcrumb currentPage="Docker" />
          <div className="mt-8 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Try Elsa with Docker
            </h1>
            <p className="text-xl text-muted-foreground">
              Experience Elsa Workflows in minutes using pre-built container
              images. These containers provide a sandbox environment for
              exploration and evaluation.
            </p>
          </div>
        </div>
      </section>

      {/* Callout */}
      <section className="py-8">
        <div className="container">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-6">
            <div className="flex gap-4">
              <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  For Exploration Only
                </h3>
                <p className="text-muted-foreground">
                  These containers are built from our workbench projects and are
                  intended for exploration and demonstrations. For production
                  deployments, build your own application using our{" "}
                  <Link
                    to="/get-started"
                    className="text-primary hover:underline font-medium"
                  >
                    setup guides
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prerequisites */}
      <section className="py-8">
        <div className="container max-w-4xl">
          <PrerequisitesBox
            items={[
              "Docker Desktop or Docker Engine installed",
              "Terminal or command line access",
            ]}
          />
        </div>
      </section>

      {/* Docker Options */}
      <section className="py-8 md:py-12">
        <div className="container max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">Choose a Container</h2>
          <div className="space-y-6">
            {dockerOptions.map((option) => (
              <DockerSection key={option.title} {...option} />
            ))}
          </div>
        </div>
      </section>

      {/* Runtime Builder tip */}
      <section className="py-8">
        <div className="container max-w-4xl">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
            <div className="h-11 w-11 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Prefer a guided setup?</h3>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  Preview
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Try the Runtime Builder to compose an Elsa runtime visually and preview a tailored docker-compose bundle. Concept build on sample data.
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2 shrink-0">
              <Link to="/elsa-plus/runtime-builder">
                Open Runtime Builder
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Ready to Build Your Own?</h2>
            <p className="text-muted-foreground mb-8">
              Once you've explored Elsa, set up your own project with full
              control over configuration and deployment.
            </p>
            <Button asChild size="lg">
              <Link to="/get-started#build-your-own" className="gap-2">
                View Setup Guides
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
