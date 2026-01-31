import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Github,
  MessageCircle,
  Package,
  FileCode,
  Users,
  Newspaper,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

const primaryResources = [
  {
    icon: BookOpen,
    title: "Documentation",
    description:
      "Comprehensive guides, tutorials, and API reference for Elsa Workflows v3.",
    href: "https://v3.elsaworkflows.io/",
    cta: "Read the Docs",
  },
  {
    icon: Github,
    title: "GitHub Repository",
    description:
      "Explore the source code, contribute to development, or report issues.",
    href: "https://github.com/elsa-workflows/elsa-core",
    cta: "View on GitHub",
  },
  {
    icon: MessageCircle,
    title: "Discord Community",
    description:
      "Join thousands of developers discussing Elsa, sharing solutions, and helping each other.",
    href: "https://discord.gg/hhChk5H472",
    cta: "Join Discord",
  },
];

const additionalResources = [
  {
    icon: Newspaper,
    title: "Community Content",
    description: "Blog posts, videos & tutorials",
    href: "/resources/community-content",
    isInternal: true,
  },
  {
    icon: Package,
    title: "NuGet Packages",
    description: "All official Elsa packages",
    href: "https://www.nuget.org/profiles/phalanx",
  },
  {
    icon: FileCode,
    title: "Sample Projects",
    description: "Example implementations",
    href: "https://github.com/elsa-workflows/elsa-core/tree/main/samples",
  },
  {
    icon: Users,
    title: "Contributing Guide",
    description: "How to contribute to Elsa",
    href: "https://github.com/elsa-workflows/elsa-core/blob/main/CONTRIBUTING.md",
  },
];

const communityLinks = [
  {
    title: "Report an Issue",
    description: "Found a bug? Let us know on GitHub Issues.",
    href: "https://github.com/elsa-workflows/elsa-core/issues",
  },
  {
    title: "Request a Feature",
    description: "Have an idea? Start a discussion with the community.",
    href: "https://github.com/elsa-workflows/elsa-core/discussions/categories/ideas",
  },
  {
    title: "Stack Overflow",
    description: "Ask questions tagged with 'elsa-workflow'.",
    href: "https://stackoverflow.com/questions/tagged/elsa-workflow",
  },
];

export default function Resources() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Resources & Community
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to learn, build, and connect with the Elsa Workflows community.
            </p>
          </div>
        </div>
      </section>

      {/* Primary Resources */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {primaryResources.map((resource) => (
              <a
                key={resource.title}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:border-primary/50 transition-all hover:shadow-xl">
                  <CardHeader className="pb-4">
                    <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center mb-4">
                      <resource.icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-xl">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">{resource.description}</p>
                    <span className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
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

      {/* Additional Resources */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">More Resources</h2>
            <p className="text-lg text-muted-foreground">
              Dive deeper into the Elsa ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalResources.map((resource) => {
              const isInternal = "isInternal" in resource && resource.isInternal;
              const CardWrapper = isInternal ? Link : "a";
              const linkProps = isInternal
                ? { to: resource.href }
                : { href: resource.href, target: "_blank", rel: "noopener noreferrer" };

              return (
                <CardWrapper
                  key={resource.title}
                  {...(linkProps as any)}
                  className="group block"
                >
                  <Card className="h-full hover:border-primary/50 transition-all">
                    <CardContent className="p-6">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <resource.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-1 flex items-center gap-2">
                        {resource.title}
                        {!isInternal && (
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        {isInternal && (
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                    </CardContent>
                  </Card>
                </CardWrapper>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Get Involved</h2>
              <p className="text-lg text-muted-foreground">
                Join the conversation, report issues, or contribute to the project.
              </p>
            </div>

            <div className="space-y-4">
              {communityLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <Card className="hover:border-primary/50 transition-all">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">{link.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {link.description}
                        </p>
                      </div>
                      <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Need Professional Support?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Get professional services, priority support, and training from the Elsa team.
            </p>
            <Button size="lg" className="gap-2" asChild>
              <Link to="/elsa-plus">
                Explore Elsa+
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
