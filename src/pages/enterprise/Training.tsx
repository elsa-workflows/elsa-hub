import { Seo } from "@/components/Seo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NeutralityDisclaimer, TrainingInterestDialog } from "@/components/enterprise";
import type { TrainingInterestIntent } from "@/lib/trainingInterest";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Mail,
  Users,
  Video,
} from "lucide-react";

const fundamentalsOutcomes = [
  "Explain Elsa 3’s core model in team language (definitions vs instances, activities, triggers, bookmarks)",
  "Host Elsa in ASP.NET Core with management, runtime, API, and HTTP wired for real work",
  "Design Flowchart workflows in Studio — variables, expressions, and Decision branching",
  "Build and publish HTTP-triggered workflows your team can call with curl/Postman",
  "Inspect instances (journal/incidents) and know when Studio vs code-first is the right authoring path",
];

const prerequisites = [
  "Comfortable with C# and ASP.NET Core",
  ".NET 8 SDK",
  "IDE",
  "Basic HTTP/API",
  "Git",
];

const trainingFormats = [
  {
    icon: Users,
    title: "Workshops",
    description:
      "Facilitator-led live sessions — the primary offer. Half-day enablement kickstart or a full day with deeper labs.",
    status: "available" as const,
    primary: true,
  },
  {
    icon: Video,
    title: "Courses",
    description: "Structured learning paths are not sold yet. Workshops come first.",
    status: "later" as const,
  },
  {
    icon: BookOpen,
    title: "Self-paced",
    description: "No course library in v1. Self-paced materials come later.",
    status: "later" as const,
  },
  {
    icon: Award,
    title: "Certifications",
    description:
      "Not live. The intended path is workshop → self-paced → certifications.",
    status: "later" as const,
  },
];

export default function Training() {
  const [interest, setInterest] = useState<TrainingInterestIntent | null>(null);

  return (
    <Layout>
      <Seo
        path="/elsa-plus/training"
        title="Elsa Workflows Fundamentals for Teams — Elsa+"
        description="Live half-day and full-day workshops for mid-size .NET teams adopting Elsa 3. Hands-on labs on a real host and Studio — notify when seats open or request a private team workshop."
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
                <BreadcrumbPage>Training & Academy</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Elsa Workflows Fundamentals for Teams
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Live half-day and full-day workshops for mid-size .NET teams adopting Elsa 3.
              Hands-on labs on a real host and Studio — so developers, tech leads, and platform
              folks share one playbook instead of tribal knowledge.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Button size="lg" className="gap-2" onClick={() => setInterest("notify")}>
                Notify me when seats open
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setInterest("quote")}
              >
                Request a private team workshop
              </Button>
            </div>
            <p className="text-sm font-medium mb-3">
              Public seats from €449 · Private team workshops from €3,200 — EUR excl. VAT;
              early-bird and full grid on invite/quote
            </p>
            <p className="text-sm text-muted-foreground">
              An independent Elsa+ offering. Elsa Workflows remains fully open source and
              vendor-neutral.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
              What’s in Fundamentals
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A facilitator-led live workshop on Elsa 3.x (3.8 family). Same spine for half-day
              and full day — the day extends the labs; it doesn’t reinvent the course.
            </p>
            <p className="text-sm text-muted-foreground mb-8">Facilitator TBA.</p>

            <ul className="space-y-4 mb-8">
              {fundamentalsOutcomes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-muted-foreground mb-6">
              1-day extends with code-first, long-running basics, testing, and a team capstone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-1">Half-day</p>
                  <p className="text-sm text-muted-foreground">Enablement kickstart</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-1">One-day</p>
                  <p className="text-sm text-muted-foreground">
                    + code-first / long-running intro / capstone
                  </p>
                </CardContent>
              </Card>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="prerequisites">
                <AccordionTrigger>Prerequisites</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 mb-3">
                    {prerequisites.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    Elsa 2 and Kubernetes/clustering not required.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Training Formats
            </h2>

            <Card className="mb-8 border-primary/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">Workshops</h3>
                      <Badge>Available</Badge>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Facilitator-led live sessions — the primary offer. Half-day enablement
                      kickstart or a full day with deeper labs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button className="gap-2" onClick={() => setInterest("notify")}>
                        Notify me when seats open
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => setInterest("quote")}>
                        Request a private team workshop
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trainingFormats
                .filter((format) => !format.primary)
                .map((format) => (
                  <Card key={format.title} className="opacity-80">
                    <CardContent className="p-6 flex gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <format.icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{format.title}</h3>
                          <Badge variant="secondary">Later</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{format.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Pricing</h2>
            <Card>
              <CardContent className="p-8 md:p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Public seats</p>
                    <p className="text-2xl font-bold mb-2">from €449</p>
                    <p className="text-sm text-muted-foreground">
                      Half-day early-bird · from €849 1-day early-bird
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Private team workshops
                    </p>
                    <p className="text-2xl font-bold mb-2">from €3,200</p>
                    <p className="text-sm text-muted-foreground">
                      Half-day, up to 12 people
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-8">
                  Full grid on invite/quote. EUR excl. VAT. One early-bird per cohort.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="gap-2" onClick={() => setInterest("notify")}>
                    Notify me for early-bird
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setInterest("quote")}>
                    Get a private quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Providers</h2>
            <p className="text-muted-foreground mb-2">
              No training providers are listed yet.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Listing is not automatic.
            </p>
            <Button variant="outline" onClick={() => setInterest("provider")}>
              Offer Elsa Workflows training?
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Looking for training?</h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Public seats and private team workshops — leave your email and we’ll follow up.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <Button size="lg" className="gap-2" onClick={() => setInterest("notify")}>
                  Notify Me
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setInterest("quote")}>
                  Request a private quote
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                We’ll only email you about Elsa+ Training dates and quotes.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <TrainingInterestDialog
        key={interest ?? "closed"}
        open={interest !== null}
        intent={interest ?? "notify"}
        onOpenChange={(open) => {
          if (!open) setInterest(null);
        }}
      />

      <section className="pb-16 md:pb-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
