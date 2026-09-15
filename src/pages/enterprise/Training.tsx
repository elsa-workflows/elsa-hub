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
import {
  FUNDAMENTALS_CORE_GUMROAD_URL,
  type TrainingInterestIntent,
} from "@/lib/trainingInterest";
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

const laterFormats = [
  {
    icon: Video,
    title: "Courses",
    description: "Structured learning paths are not sold yet.",
  },
  {
    icon: Award,
    title: "Certifications",
    description: "Not live. The intended path is self-paced → private workshop → certifications.",
  },
];

const privatePackages = ["€3,200", "€5,200", "€7,200"];

function GetFundamentalsCoreButton({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <Button size={size} className="gap-2" asChild>
      <a
        href={FUNDAMENTALS_CORE_GUMROAD_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Get Fundamentals Core
        <ArrowRight className="h-4 w-4" />
      </a>
    </Button>
  );
}

export default function Training() {
  const [interest, setInterest] = useState<TrainingInterestIntent | null>(null);

  return (
    <Layout>
      <Seo
        path="/elsa-plus/training"
        title="Elsa Workflows Fundamentals for Teams — Elsa+"
        description="Self-paced Elsa Workflows Fundamentals Core for mid-size .NET teams adopting Elsa 3 — Modules 0–5, a cloneable lab kit, and Labs A–C (~5–6 hours). Request a private team workshop."
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
              Self-paced <strong className="font-semibold text-foreground">Core</strong> for
              mid-size .NET teams adopting Elsa 3 — modules, a cloneable lab kit, and Labs A–C
              (~5–6 hours solo). Prefer a facilitator for your whole team? Request a private
              workshop.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <GetFundamentalsCoreButton size="lg" />
              <Button
                size="lg"
                variant="outline"
                onClick={() => setInterest("quote")}
              >
                Request a private team workshop
              </Button>
            </div>
            <p className="text-sm font-medium mb-3">
              Self-paced Core from <strong>€399</strong> · Private team workshops from{" "}
              <strong>€3,200</strong> — EUR excl. VAT
            </p>
            <p className="text-sm text-muted-foreground">
              An independent Elsa+ offering.
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
            <p className="text-muted-foreground leading-relaxed mb-8">
              Self-paced Core on Elsa 3.8.1: Modules 0–5, a cloneable lab kit, and Labs A–C
              (~5–6 hours solo).
            </p>

            <ul className="space-y-4 mb-8">
              {fundamentalsOutcomes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted-foreground mb-8">
              Later upsell: Fundamentals Complete (€699 / €849) — not the current offer.
            </p>

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
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">Self-paced</h3>
                      <Badge>Available</Badge>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Fundamentals Core — Modules 0–5, a cloneable lab kit, and Labs A–C
                      (~5–6 hours solo) on Elsa 3.8.1. From €399, EUR excl. VAT.
                    </p>
                    <GetFundamentalsCoreButton />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
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
                      Private team workshops only — a facilitator for your whole team. From
                      €3,200, EUR excl. VAT.
                    </p>
                    <div className="mb-6">
                      <h4 className="text-base font-semibold mb-2">
                        Module available for private teams: Approval Lite
                      </h4>
                      <p className="text-muted-foreground mb-3">
                        Half-day facilitator-led architecture case for mid-size .NET teams
                        past Fundamentals Core. Covers the approval decision tree (AP1) and
                        a thin multi-role lab with rewind (AP2) on Elsa 3.8.1.
                      </p>
                      <p className="text-muted-foreground">
                        Request a private quote and note &quot;Approval Lite&quot; in your
                        message.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setInterest("quote")}>
                      Request a private team workshop
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      Private quotes can include Fundamentals and/or the Approval Lite
                      module. Tell us which in your message.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {laterFormats.map((format) => (
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
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Self-paced Core
                    </p>
                    <p className="text-2xl font-bold mb-2">from €399</p>
                    <p className="text-sm text-muted-foreground">
                      Modules 0–5 + Labs A–C · Elsa 3.8.1
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Private team workshops
                    </p>
                    <p className="text-2xl font-bold mb-2">from €3,200</p>
                    <p className="text-sm text-muted-foreground">
                      {privatePackages.join(" · ")}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">EUR excl. VAT.</p>
                <p className="text-sm text-muted-foreground mb-8">
                  Later: Fundamentals Complete (€699 / €849).
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <GetFundamentalsCoreButton />
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
                Buy self-paced Core now, or leave your details and we’ll follow up about a
                private team workshop.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <GetFundamentalsCoreButton size="lg" />
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
        defaultInterest={interest === "notify" ? "self_paced" : undefined}
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
