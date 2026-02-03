import { useState } from "react";
import { Package, FileCode2, Users, ArrowRight, Sparkles } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewsletterSubscribeDialog } from "@/components/newsletter";

const marketplaceSections = [
  {
    id: "modules",
    title: "Premium Modules",
    description:
      "Extend Elsa with powerful modules providing additional activities, connectors, and integrations for enterprise workflows.",
    icon: Package,
    features: [
      "Enterprise connectors (SAP, Salesforce, ServiceNow)",
      "Advanced persistence providers",
      "Custom activity libraries",
      "Security & compliance modules",
    ],
  },
  {
    id: "templates",
    title: "Workflow Templates",
    description:
      "Jump-start your projects with battle-tested workflow templates for common business processes and integration patterns.",
    icon: FileCode2,
    features: [
      "Approval & review workflows",
      "Document processing pipelines",
      "Integration orchestration patterns",
      "Event-driven automation templates",
    ],
  },
  {
    id: "talent",
    title: "Talent & Services",
    description:
      "Connect with certified developers, consultants, and development teams offering Elsa implementation and support services.",
    icon: Users,
    features: [
      "Certified Elsa developers",
      "Implementation partners",
      "Custom development services",
      "Ongoing support & maintenance",
    ],
  },
];

function MarketplaceSectionCard({
  section,
}: {
  section: (typeof marketplaceSections)[0];
}) {
  const Icon = section.icon;

  return (
    <Card className="group relative overflow-hidden border-2 hover:border-primary/30 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-8 relative">
        <div className="flex items-start gap-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold">{section.title}</h3>
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {section.description}
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              {section.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              className="gap-2 text-primary hover:text-primary p-0 h-auto font-medium group/btn"
              disabled
            >
              Explore {section.title.toLowerCase()}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DialogConfig {
  open: boolean;
  title: string;
  description: string;
  buttonText: string;
  successMessage: string;
}

export default function Marketplace() {
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    open: false,
    title: "",
    description: "",
    buttonText: "Notify Me",
    successMessage: "You're on the list!",
  });

  const openDialog = (type: "earlyAccess" | "vendor") => {
    const configs = {
      earlyAccess: {
        title: "Get Early Access",
        description: "Be the first to know when the Elsa Marketplace launches.",
        buttonText: "Notify Me",
        successMessage: "You're on the list! We'll notify you when the Marketplace launches.",
      },
      vendor: {
        title: "Become a Vendor",
        description: "Register your interest in offering modules, templates, or services on the Elsa Marketplace.",
        buttonText: "Register Interest",
        successMessage: "Thanks for your interest! We'll be in touch about vendor opportunities.",
      },
    };
    setDialogConfig({ open: true, ...configs[type] });
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Elsa Marketplace
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Discover premium modules, workflow templates, and connect with
              certified developers and consultants. Your one-stop destination
              for extending and implementing Elsa Workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Marketplace Sections */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="space-y-6">
            {marketplaceSections.map((section) => (
              <MarketplaceSectionCard key={section.id} section={section} />
            ))}
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Be the First to Know
              </h2>
              <p className="text-primary-foreground/90 text-lg mb-6 max-w-2xl mx-auto">
                The Elsa Marketplace is under development. Sign up to get early
                access and be notified when we launch new modules, templates,
                and services.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-background text-foreground hover:bg-background/90 gap-2"
                  onClick={() => openDialog("earlyAccess")}
                >
                  Request Early Access
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* For Vendors Section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container max-w-4xl">
          <div className="text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">
              Become a Marketplace Vendor
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Are you a developer, consultant, or organization with Elsa
              expertise? Join the marketplace to offer your modules, templates,
              or services to the growing Elsa community.
            </p>
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2"
              onClick={() => openDialog("vendor")}
            >
              Express Vendor Interest
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <NewsletterSubscribeDialog
        open={dialogConfig.open}
        onOpenChange={(open) => setDialogConfig((prev) => ({ ...prev, open }))}
        title={dialogConfig.title}
        description={dialogConfig.description}
        buttonText={dialogConfig.buttonText}
        successMessage={dialogConfig.successMessage}
      />
    </Layout>
  );
}
