import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Cpu,
  Database,
  Download,
  Layers,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PreviewBanner } from "@/components/runtime-builder/PreviewBanner";
import { PreviewBadge } from "@/components/runtime-builder/PreviewBadge";

const FEATURES = [
  {
    icon: Boxes,
    title: "Capability-first",
    body: "Compose your runtime by enabling capabilities like persistence, messaging or AI — packages are resolved for you.",
  },
  {
    icon: Cpu,
    title: "Image-aware",
    body: "Pick a Docker runtime image and the catalog narrows to compatible capabilities and versions automatically.",
  },
  {
    icon: Wand2,
    title: "Schema-driven forms",
    body: "Settings forms are generated from feature metadata: smart defaults, secret fields, env-var hints, validation.",
  },
  {
    icon: Layers,
    title: "Compatibility validation",
    body: "Conflicts and missing dependencies surface inline with one-click resolutions and a deployment readiness score.",
  },
  {
    icon: Database,
    title: "Production templates",
    body: "Generates docker-compose with PostgreSQL, RabbitMQ and Redis services wired up to your selections.",
  },
  {
    icon: Download,
    title: "Inspect and export",
    body: "Preview every file in the bundle. Copy or download individually now — single-click zip download ships next.",
  },
];

export default function RuntimeBuilderLanding() {
  return (
    <Layout>
      <Seo
        path="/elsa-plus/runtime-builder"
        title="Elsa Runtime Builder (Preview) — compose your Docker deployment"
        description="An early concept of the Elsa Runtime Builder: visually compose a runtime, enable capabilities, and preview a deployment bundle. Public preview running on sample catalog data."
      />

      <section className="container mx-auto px-4 pt-6">
        <PreviewBanner />
      </section>

      <section className="border-b border-border/50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <PreviewBadge className="mb-5" label="Public preview · Concept" />
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
              Compose your Elsa runtime
              <br />
              <span className="text-primary">visually.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              An early look at how teams will compose Elsa runtimes. Pick a
              Docker image, toggle capabilities, configure the details, and
              preview a deployment bundle ready for{" "}
              <code className="font-mono text-foreground/80">docker compose up</code>.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/elsa-plus/runtime-builder/new">
                  Start a new build <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/elsa-plus/docker-images">Browse runtime images</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No sign-in required. Your build auto-saves to this browser.
            </p>
          </div>
        </div>
      </section>

      {/* What's real today vs what's coming */}
      <section className="container mx-auto px-4 pt-12">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="font-display text-base font-semibold">
              What you can do today
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>• Walk through the full 5-step composer flow</li>
              <li>• Toggle capabilities and see compatibility validation</li>
              <li>• Preview every file in the generated bundle</li>
              <li>• Export and re-import your build configuration as JSON</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-xl">
            <h3 className="font-display text-base font-semibold">
              What's coming next
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>• Catalog backed by real, versioned Docker images</li>
              <li>• Single-click <code className="font-mono">deployment.zip</code> download</li>
              <li>• Saved builds for teams and shareable links</li>
              <li>• Direct push to your registry of choice</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-xl"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/60">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-10">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Try the concept
            </h2>
            <p className="text-sm text-muted-foreground">
              The composer is a public preview running on sample data. Real
              bundle generation and saved builds ship next.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/elsa-plus/runtime-builder/new">
              Open the composer →
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
