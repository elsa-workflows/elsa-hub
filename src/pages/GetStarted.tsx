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
import { GuideCard, PathCard } from "@/components/get-started";

const paths = [
  {
    icon: Container,
    title: "Try with Docker",
    subtitle: "Explore Elsa in minutes",
    description:
      "Run pre-built containers to experience the workflow engine and visual designer. No development environment required.",
    bestFor: [
      "Evaluating features",
      "Quick demonstrations",
      "First-time exploration",
    ],
    href: "/get-started/docker",
    cta: "Launch Containers",
  },
  {
    icon: Code2,
    title: "Build Your Own",
    subtitle: "Create a custom solution",
    description:
      "Set up Elsa in your own ASP.NET Core project with full control over configuration and deployment.",
    bestFor: [
      "Production applications",
      "Custom integrations",
      "Full flexibility",
    ],
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
    bestFor: [
      "API-first architectures",
      "Microservices",
      "Custom frontends",
    ],
    href: "/get-started/elsa-server",
  },
  {
    icon: LayoutIcon,
    title: "Elsa Studio",
    description:
      "Set up the visual workflow designer. Connects to an existing Elsa Server to provide a complete management UI.",
    bestFor: [
      "Separate backend and frontend",
      "Existing Elsa Server users",
      "Custom branding needs",
    ],
    href: "/get-started/elsa-studio",
  },
  {
    icon: Layers,
    title: "Elsa Server + Studio",
    description:
      "Create a single application that runs both the workflow engine and designer together. The quickest path to a complete solution.",
    bestFor: [
      "Getting started quickly",
      "Demos and prototypes",
      "Small to medium deployments",
    ],
    href: "/get-started/elsa-server-and-studio",
    badge: "Recommended",
  },
];

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Comprehensive guides and API reference",
    href: "https://v3.elsaworkflows.io/",
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
    href: "https://www.nuget.org/profiles/phalanx",
    cta: "Browse Packages",
  },
  {
    icon: Play,
    title: "Sample Projects",
    description: "Example implementations and demos",
    href: "https://github.com/elsa-workflows/elsa-core/tree/main/samples",
    cta: "View Samples",
  },
];

export default function GetStarted() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get Started with Elsa
            </h1>
            <p className="text-xl text-muted-foreground">
              Whether you want to explore Elsa quickly or build a production
              solution, we have you covered.
            </p>
          </div>
        </div>
      </section>

      {/* Choose Your Path */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Choose Your Path</h2>
            <p className="text-muted-foreground max-w-2xl">
              Just want to explore? Try our Docker containers. Ready to build?
              Create your own project from scratch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {paths.map((path) => (
              <PathCard key={path.title} {...path} />
            ))}
          </div>
        </div>
      </section>

      {/* Build Your Own - Guide Cards */}
      <section id="build-your-own" className="py-16 md:py-20 bg-surface-subtle scroll-mt-20">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Build Your Own</h2>
            <p className="text-muted-foreground max-w-2xl">
              Elsa Workflows offers flexible deployment options. Select the
              setup that matches your architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <GuideCard key={guide.title} {...guide} />
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Resources & Documentation</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master Elsa Workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource) => (
              <a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:border-primary/50 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                      <resource.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {resource.description}
                    </p>
                    <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      {resource.cta}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
