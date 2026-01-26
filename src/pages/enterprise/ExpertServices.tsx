import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowRight,
  Check,
  X,
  Video,
  MessageSquare,
  Users,
  Search,
  Clock,
  Calendar,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const capabilities = [
  "Workflow and domain modeling",
  "Architecture and system design",
  "Persistence, scaling, and performance",
  "Multitenancy",
  "Triggers, bookmarks, orchestration",
  "Designer extensions and customization",
  "Production troubleshooting",
  "Technical decision-making and roadmap guidance",
];

const forWhom = [
  "Teams using Elsa Workflows in real projects",
  "Organizations running or preparing for production",
  "Developers facing non-trivial architectural or workflow challenges",
];

const notForWhom = [
  "Hobby projects or casual experimentation",
  "General .NET mentoring unrelated to Elsa",
  "Teams looking for staff augmentation",
];

const engagementFormats = [
  { icon: Video, label: "Video calls" },
  { icon: MessageSquare, label: "Async reviews and feedback" },
  { icon: Users, label: "Pair programming" },
  { icon: Search, label: "Short investigations or debugging sessions" },
];

const bundles = [
  {
    name: "Guidance Pack",
    credits: 10,
    price: 1800,
    description: "Best for architecture reviews, early design validation, and focused expert guidance.",
    popular: false,
  },
  {
    name: "Implementation Pack",
    credits: 20,
    price: 3400,
    description: "Best for active development, troubleshooting, pairing, and deeper technical involvement.",
    popular: true,
  },
  {
    name: "Delivery Pack",
    credits: 40,
    price: 6400,
    description: "Best for production systems, larger initiatives, and ongoing architectural or engineering support.",
    popular: false,
  },
];

const howWeWork = [
  "Enablement over replacement — we guide, you build",
  "Guidance, reviews, and proof-of-concepts",
  "Pair programming with explanation",
  "Repository access for troubleshooting when needed",
];

const notIncluded = [
  "Guaranteed response times or SLAs",
  "24/7 or on-call availability",
  "Unlimited async support",
  "Acting as a long-term team member",
  "Ownership of project delivery or deadlines",
  "General .NET, cloud, or DevOps consulting unrelated to Elsa",
  "Bypassing open-source community processes",
];

export default function ExpertServices() {
  return (
    <Layout>
      {/* Breadcrumb */}
      <section className="pt-8 pb-4">
        <div className="container">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/enterprise">Enterprise</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Expert Services</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Provided by Skywalker Digital
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Elsa Workflows Expert Services
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Direct access to the creator and core maintainer of Elsa Workflows.
            </p>
            <p className="text-lg text-muted-foreground">
              Get expert guidance, unblock your team, and build with confidence. 
              Whether you need architectural clarity, hands-on pairing, or production troubleshooting — 
              Skywalker Digital is here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Who This Service Is For
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {/* For */}
              <div>
                <h3 className="text-lg font-semibold mb-6 text-foreground">
                  This service is for:
                </h3>
                <ul className="space-y-4">
                  {forWhom.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Not for */}
              <div>
                <h3 className="text-lg font-semibold mb-6 text-foreground">
                  This service is not for:
                </h3>
                <ul className="space-y-4">
                  {notForWhom.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              What This Service Covers
            </h2>
            <p className="text-muted-foreground text-center mb-12">
              These are examples, not an exhaustive list.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capabilities.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 p-4 rounded-lg bg-background border"
                >
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Engagement Works */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              How Engagement Works
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Credit model */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Service Credits</h3>
                <p className="text-muted-foreground mb-6">
                  All services are delivered using prepaid Service Credits, giving you flexibility 
                  to use them as needed across different types of engagements.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>1 Service Credit = 1 hour</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <span>Consumed in 15-minute increments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Credits valid for 12 months</span>
                  </li>
                </ul>
              </div>
              
              {/* Engagement formats */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Engagement Formats</h3>
                <p className="text-muted-foreground mb-6">
                  Use your credits flexibly across different formats depending on what you need.
                </p>
                <ul className="space-y-4">
                  {engagementFormats.map((format) => (
                    <li key={format.label} className="flex items-center gap-3">
                      <format.icon className="h-5 w-5 text-primary" />
                      <span>{format.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bundles */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              Service Credit Bundles
            </h2>
            <p className="text-muted-foreground text-center mb-12">
              Choose the bundle that fits your needs.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bundles.map((bundle) => (
                <Card
                  key={bundle.name}
                  className={cn(
                    "relative transition-shadow",
                    bundle.popular
                      ? "border-primary shadow-lg md:-translate-y-2"
                      : "hover:shadow-md"
                  )}
                >
                  {bundle.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{bundle.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="mb-4">
                      <span className="text-4xl font-bold">€{bundle.price.toLocaleString()}</span>
                    </div>
                    <p className="text-2xl font-semibold text-primary mb-4">
                      {bundle.credits} Credits
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {bundle.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ongoing Advisory */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 md:p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <Badge variant="secondary" className="mb-4">Optional</Badge>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">
                      Ongoing Advisory
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      For teams running Elsa in production who want continuous expert access 
                      and retained context.
                    </p>
                    <div className="text-3xl font-bold">
                      €2,000<span className="text-lg font-normal text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <div>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>6 Service Credits per month</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>Priority scheduling</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>Async Q&A access</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>Continuity and retained context</span>
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                      Extra credits can be purchased separately.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Working Together */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Working Together
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* How we work */}
              <div>
                <h3 className="text-xl font-semibold mb-6">How Engagements Typically Work</h3>
                <ul className="space-y-4">
                  {howWeWork.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Not included */}
              <div>
                <h3 className="text-xl font-semibold mb-6">What's Not Included</h3>
                <ul className="space-y-4">
                  {notIncluded.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Urgent support note */}
            <div className="mt-12 p-6 rounded-lg bg-background border flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Urgent / After-Hours Support</p>
                <p className="text-sm text-muted-foreground">
                  Urgent or after-hours support may be available for production-blocking issues, 
                  billed at 2× the standard rate and subject to availability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <Card className="max-w-4xl mx-auto gradient-primary text-primary-foreground">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
                Reach out to discuss your needs and find the right engagement for your team.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 bg-background text-foreground hover:bg-background/90"
                  asChild
                >
                  <a href="mailto:info@skywalker-digital.com?subject=Skywalker%20Digital%20-%20Expert%20Services%20Inquiry">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <a href="mailto:info@skywalker-digital.com?subject=Skywalker%20Digital%20-%20Expert%20Services%20Question">
                    Have Questions?
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Neutrality Disclaimer */}
      <section className="pb-16 md:pb-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
