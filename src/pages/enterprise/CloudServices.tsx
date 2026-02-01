import { useState } from "react";
import {
  Cloud,
  Server,
  Shield,
  RefreshCw,
  Database,
  Users,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Container,
  Headphones,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
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
import { NewsletterSubscribeDialog } from "@/components/newsletter";

const includedFeatures = [
  {
    title: "Fully managed Elsa Workflows runtime",
    description:
      "The complete Elsa engine deployed and configured for production use.",
    icon: Server,
  },
  {
    title: "Secure cloud deployment",
    description:
      "Infrastructure provisioned with security best practices and network isolation.",
    icon: Shield,
  },
  {
    title: "Monitoring and operational support",
    description:
      "System health monitoring, alerting, and basic operational assistance.",
    icon: Cloud,
  },
  {
    title: "Managed updates and maintenance",
    description:
      "Regular updates to Elsa and underlying infrastructure with minimal disruption.",
    icon: RefreshCw,
  },
  {
    title: "Backup and recovery",
    description:
      "Automated backups and documented recovery procedures for your workflow data.",
    icon: Database,
  },
  {
    title: "Environment isolation",
    description:
      "Dedicated resources ensuring your workflows run independently of other customers.",
    icon: Users,
  },
];

const notIncluded = [
  "Custom workflow development or business logic implementation",
  "End-user application hosting beyond the Elsa runtime",
  "On-demand feature development or customization",
  "Integration development with external systems",
  "Pricing details (discussed separately based on requirements)",
];

const idealFor = [
  {
    title: "Teams focused on workflow logic",
    description:
      "Organizations that want to invest engineering time in building workflows, not managing infrastructure.",
  },
  {
    title: "Limited DevOps capacity",
    description:
      "Teams without dedicated infrastructure engineers or platform specialists.",
  },
  {
    title: "Enterprise requirements",
    description:
      "Organizations that need a professionally operated, supported deployment with clear accountability.",
  },
  {
    title: "Rapid deployment needs",
    description:
      "Projects that require a production-ready Elsa environment without lengthy setup cycles.",
  },
];

const notIdealFor = [
  {
    title: "Existing infrastructure teams",
    description:
      "Organizations with established platform teams who prefer to operate their own deployments.",
  },
  {
    title: "Full deployment control required",
    description:
      "Scenarios requiring complete control over infrastructure configuration and deployment timing.",
  },
  {
    title: "Highly customized operations",
    description:
      "Use cases requiring non-standard operational procedures or specialized infrastructure setups.",
  },
];

const relatedOfferings = [
  {
    title: "Self-Hosted Deployment",
    description:
      "Deploy Elsa on your own infrastructure using our open-source packages and documentation.",
    href: "/get-started",
    icon: Server,
  },
  {
    title: "Production Docker Images",
    description:
      "Production-ready container images for organizations running their own container platforms.",
    href: "/elsa-plus/production-docker",
    icon: Container,
  },
  {
    title: "Expert Advisory & Engineering",
    description:
      "Professional services for architecture review, implementation guidance, and troubleshooting.",
    href: "/elsa-plus/expert-services",
    icon: Headphones,
  },
];

export default function CloudServices() {
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);

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
                <BreadcrumbPage>Cloud & Managed Services</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Page Header */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              Coming Soon
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Managed Cloud Hosting
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Elsa Workflows deployed, operated, and maintained as a managed
              service. Focus on building workflows while infrastructure
              management is handled for you.
            </p>
          </div>
        </div>
      </section>

      {/* What It Is */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              What Managed Hosting Means
            </h2>
            <div className="prose prose-lg text-muted-foreground space-y-4">
              <p>
                Managed cloud hosting for Elsa Workflows means the complete
                runtime environment is deployed, configured, operated, updated,
                and monitored by a qualified service provider. You interact with Elsa through
                its APIs and designer while infrastructure concerns are
                abstracted away.
              </p>
              <p>
                This approach prioritizes operational simplicity and
                reliability. Rather than provisioning servers, configuring
                databases, managing container orchestration, and handling
                updates, your team can focus entirely on workflow design and
                business logic.
              </p>
              <p>
                Managed hosting is an alternative to self-hosting for teams that
                prefer not to operate their own Elsa infrastructure—whether due
                to resource constraints, operational preferences, or a desire
                for reduced maintenance burden.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Is Included */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            What Is Included
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {includedFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="bg-background">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Is Not Included */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              What Is Not Included
            </h2>
            <p className="text-muted-foreground mb-6">
              To set clear expectations, the following are outside the scope of
              managed hosting:
            </p>
            <ul className="space-y-3">
              {notIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-6">
              Some of these services may be available through separate
              professional services engagements.
            </p>
          </div>
        </div>
      </section>

      {/* Who This Is For / Not For */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Ideal For */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Who This Is For
              </h2>
              <div className="space-y-4">
                {idealFor.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Not Ideal For */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                When Self-Hosting May Be Better
              </h2>
              <div className="space-y-4">
                {notIdealFor.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Relationship to Other Offerings */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Part of the Elsa Ecosystem
            </h2>
            <p className="text-muted-foreground">
              Managed cloud hosting is one option within the broader Elsa
              ecosystem. Depending on your requirements, other approaches may be
              more suitable.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedOfferings.map((offering) => {
              const Icon = offering.icon;
              return (
                <Link key={offering.href} to={offering.href} className="group">
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <h3 className="font-semibold mb-2">{offering.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {offering.description}
                      </p>
                      <span className="text-sm font-medium text-primary inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Learn more
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Next Steps</h2>
            <p className="text-muted-foreground mb-8">
              Managed cloud hosting is currently in development. If you're
              interested in learning more or discussing whether this offering
              fits your requirements, we're happy to have a conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2" onClick={() => setNotifyDialogOpen(true)}>
                Notify Me
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <a
                  href="https://v3.elsaworkflows.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explore Documentation
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <NewsletterSubscribeDialog
        open={notifyDialogOpen}
        onOpenChange={setNotifyDialogOpen}
        title="Get Notified"
        description="Be the first to know when Managed Cloud Hosting becomes available."
        buttonText="Notify Me"
        successMessage="You're on the list! We'll notify you when Cloud Hosting is ready."
      />
    </Layout>
  );
}