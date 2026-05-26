import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Hammer,
  Bot,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step =
  | { label: string; href: string; internal?: boolean; kind?: "doc" | "guide" | "post" | "repo" }
  | { label: string; href: string; internal: true; kind?: "doc" | "guide" | "post" | "repo" };

interface LearningPath {
  id: string;
  icon: LucideIcon;
  title: string;
  audience: string;
  description: string;
  duration: string;
  steps: Step[];
}

const paths: LearningPath[] = [
  {
    id: "beginner",
    icon: Rocket,
    title: "Beginner",
    audience: "New to Elsa",
    description: "Get a workflow running on your machine in under an hour.",
    duration: "~45 minutes",
    steps: [
      { label: "Run Elsa Server + Studio via Docker", href: "/get-started/docker", internal: true, kind: "guide" },
      { label: "Install Elsa Server in a .NET app", href: "/get-started/elsa-server", internal: true, kind: "guide" },
      { label: "Install Elsa Studio (designer)", href: "/get-started/elsa-studio", internal: true, kind: "guide" },
      { label: "Read the official docs", href: "https://docs.elsaworkflows.io/", kind: "doc" },
      { label: "Browse sample projects", href: "https://github.com/elsa-workflows/elsa-samples", kind: "repo" },
    ],
  },
  {
    id: "production",
    icon: Hammer,
    title: "Building production workflows",
    audience: "Going to production",
    description: "Harden, deploy, and operate Elsa at scale.",
    duration: "~3 hours",
    steps: [
      { label: "Combined Server + Studio reference setup", href: "/get-started/elsa-server-and-studio", internal: true, kind: "guide" },
      { label: "Production checklist & guidance", href: "https://docs.elsaworkflows.io/", kind: "doc" },
      { label: "Browse the blog for deep dives", href: "/blog", internal: true, kind: "post" },
      { label: "Pre-built Docker images & runtime builder", href: "/elsa-platform", internal: true, kind: "guide" },
      { label: "Explore Elsa+ for managed hosting & support", href: "/elsa-plus", internal: true, kind: "guide" },
    ],
  },
  {
    id: "ai",
    icon: Bot,
    title: "AI agent workflows",
    audience: "Building agents",
    description: "Use Elsa as the durable backbone for LLM-driven workflows.",
    duration: "~2 hours",
    steps: [
      { label: "Start with Elsa Server + Studio", href: "/get-started/elsa-server-and-studio", internal: true, kind: "guide" },
      { label: "AI activities reference (docs)", href: "https://docs.elsaworkflows.io/", kind: "doc" },
      { label: "Filter blog posts tagged AI", href: "/blog?tag=AI", internal: true, kind: "post" },
      { label: "Sample agent workflows on GitHub", href: "https://github.com/elsa-workflows/elsa-samples", kind: "repo" },
      { label: "Ask Weaver about agent patterns", href: "/", internal: true, kind: "guide" },
    ],
  },
];

const kindLabel: Record<NonNullable<Step["kind"]>, string> = {
  doc: "Docs",
  guide: "Guide",
  post: "Blog",
  repo: "Repo",
};

function StepRow({ step, index }: { step: Step; index: number }) {
  const inner = (
    <div className="flex items-start gap-3 py-2.5 group">
      <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-border bg-background flex items-center justify-center text-xs font-medium text-muted-foreground group-hover:border-primary/40 group-hover:text-primary transition-colors">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            {step.label}
          </span>
          {step.kind && (
            <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0">
              {kindLabel[step.kind]}
            </Badge>
          )}
        </div>
      </div>
      {step.internal ? (
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      ) : (
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      )}
    </div>
  );

  if (step.internal) {
    return (
      <Link to={step.href} className="block border-b border-border last:border-b-0">
        {inner}
      </Link>
    );
  }
  return (
    <a
      href={step.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-b border-border last:border-b-0"
    >
      {inner}
    </a>
  );
}

export function LearningPaths() {
  return (
    <section id="learning-paths" className="py-16 md:py-24 scroll-mt-24">
      <div className="container">
        <div className="max-w-3xl mb-12">
          <Badge variant="outline" className="mb-3 font-normal">
            Learning paths
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Pick a path, ship something
          </h2>
          <p className="text-lg text-muted-foreground">
            Curated sequences of guides, docs, and samples — follow them in order.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {paths.map((path) => (
            <Card key={path.id} className="flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <path.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="font-normal">
                    {path.duration}
                  </Badge>
                </div>

                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {path.audience}
                </div>
                <h3 className="text-xl font-semibold mb-2">{path.title}</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  {path.description}
                </p>

                <div className="mt-auto">
                  {path.steps.map((step, i) => (
                    <StepRow key={step.href + i} step={step} index={i} />
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{path.steps.length} steps</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
