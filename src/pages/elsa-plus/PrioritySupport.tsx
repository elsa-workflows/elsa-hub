import {
  Shield,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Server,
  ArrowRight,
  ExternalLink,
  Phone,
  Mail,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollReveal } from "@/components/ScrollReveal";

const whatYouGet = [
  "Priority access over community channels",
  "Direct communication channel (private email or Slack/Teams)",
  "Faster response times (best-effort)",
  "Architecture and design guidance",
  "Help diagnosing issues in collaboration with your team",
  "Optional scheduled sessions (e.g. weekly check-ins)",
];

const whatThisIsNot = [
  "Not 24/7 support",
  "Not a managed service",
  "Not production ownership or incident response",
  "No guaranteed resolution times",
];

const responseTargets = [
  {
    severity: "Critical",
    description: "Production blocking issue",
    target: "Within 4–8 business hours",
  },
  {
    severity: "High",
    description: "Major issue or risk",
    target: "Within 1 business day",
  },
  {
    severity: "Normal",
    description: "General questions",
    target: "Within 2–3 business days",
  },
];

const reliabilityFactors = [
  "System architecture (redundancy, failover)",
  "Observability and monitoring",
  "Workflow design (idempotency, retries)",
];

export default function PrioritySupport() {
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
                <BreadcrumbPage>Priority Support</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Priority Support for Elsa Workflows
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Structured, responsive support for teams building and operating
              Elsa Workflows in production environments.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Elsa Workflows is fully open source and widely used in custom
              applications. For teams that require faster response times and
              direct access to expertise, Priority Support provides a
              structured, best-effort support model designed for engineering
              teams.
            </p>
          </div>
        </div>
      </section>

      {/* Support Model */}
      <ScrollReveal>
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                What is Priority Support?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Priority Support is a commercial support offering built around
                responsiveness, collaboration, and deep technical expertise.
              </p>
              <p className="text-muted-foreground mb-4">
                It is designed for teams that:
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  "Are building or running Elsa in production",
                  "Have internal engineering teams",
                  "Require timely guidance and issue diagnosis",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                This model focuses on working alongside your engineers, rather
                than replacing them.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Response Targets */}
      <ScrollReveal>
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="h-7 w-7 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">
                  Response Targets (Best-Effort)
                </h2>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Severity</TableHead>
                      <TableHead className="font-semibold">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold">
                        Target Response Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responseTargets.map((row) => (
                      <TableRow key={row.severity}>
                        <TableCell className="font-medium">
                          {row.severity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.target}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              <p className="text-sm text-muted-foreground mt-4 italic">
                Response times are targets, not guarantees, and apply during
                business hours. This is not a formal SLA.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* What You Get */}
      <ScrollReveal>
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="h-7 w-7 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">
                  What You Get
                </h2>
              </div>
              <ul className="space-y-3">
                {whatYouGet.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* What This Is Not */}
      <ScrollReveal>
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-7 w-7 text-muted-foreground" />
                <h2 className="text-2xl md:text-3xl font-bold">
                  What This Is Not
                </h2>
              </div>
              <ul className="space-y-3 mb-6">
                {whatThisIsNot.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                This model is designed to support your team, not replace your
                operational responsibilities.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Pricing Model */}
      <ScrollReveal>
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="h-7 w-7 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">
                  Flexible, Credit-Based Pricing
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Priority Support is delivered through Service Credits:
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  "1 credit = 1 hour of support",
                  "Sold in bundles (e.g. 10, 20, or more hours)",
                  "Valid for an extended period (typically 24 months)",
                  "Used for support, reviews, and guidance",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground italic">
                Priority Support is typically available for larger credit
                bundles.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Enterprise & Production Use */}
      <ScrollReveal>
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <Server className="h-7 w-7 text-primary" />
                <h2 className="text-2xl md:text-3xl font-bold">
                  Designed for Production Environments
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Elsa Workflows supports long-running and distributed workflows
                and can be deployed in high-availability environments.
              </p>
              <p className="text-muted-foreground mb-4">
                For regulated or mission-critical systems, reliability depends
                on:
              </p>
              <ul className="space-y-3 mb-6">
                {reliabilityFactors.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Priority Support helps teams design and operate these systems
                with confidence.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Call to Action */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Get Started
            </h2>
            <p className="text-muted-foreground mb-8">
              If you are evaluating Elsa for production use and would like to
              discuss your requirements, feel free to get in touch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2" asChild>
                <a
                  href="https://tidycal.com/valenceworks/30-minute-intro-call"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4" />
                  Schedule Intro Call
                </a>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <a href="mailto:support@elsaworkflows.io">
                  <Mail className="h-4 w-4" />
                  Contact Us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
