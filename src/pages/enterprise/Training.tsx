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
  type TrainingQuoteVariant,
} from "@/lib/trainingInterest";
import {
  TRAINING_DESCRIPTION,
  TRAINING_H1,
  TRAINING_INTRO_AFTER,
  TRAINING_INTRO_BEFORE,
  TRAINING_INTRO_EMPHASIS,
  TRAINING_LAUNCH_PRICE_EUR,
  TRAINING_LAUNCH_UNTIL_LABEL,
  TRAINING_OG_IMAGE_URL,
  TRAINING_PATH,
  TRAINING_POST_LAUNCH_PRICE_EUR,
  TRAINING_TITLE,
  trainingCourseJsonLd,
} from "@/lib/trainingSeo";
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
  "Explain how Elsa 3 works in plain terms: workflow definitions and instances, activity outcomes and outputs, triggers and bookmarks.",
  "Host Elsa 3.9.0 in an ASP.NET Core app with SQLite persistence, the Workflows API, and HTTP workflows.",
  "Build and publish a Flowchart in Elsa Studio with variables, expressions, and a Decision branch, then read the journal to see which branch ran.",
  "Publish an HTTP-triggered workflow that returns JSON, call it with curl, and follow the run in Studio.",
];

const advancedPatternsOutcomes = [
  "Decide when one long-running workflow is enough for a multi-role approval, and where state belongs: workflow variables, bookmarks, or your own database.",
  "Build an approval workflow in Elsa Studio that starts from an HTTP POST, rejects invalid input with a 400, and replies right away with a 202 and the instance ID.",
  "Pause until a manager decision arrives, and handle reject and resubmit on the same instance instead of trying to undo history.",
  "Check every path yourself with curl and the Studio journal, then confirm it with the included smoke script.",
];

const prerequisites = [
  "Comfortable with C# and ASP.NET Core",
  ".NET 8 SDK",
  "IDE",
  "Basic HTTP/API",
  "Git",
];

const extraFormats = [
  {
    icon: Award,
    title: "Completion certificates",
    description: "Included with Team 5 and Team 10.",
    later: false,
  },
  {
    icon: Video,
    title: "Courses",
    description: "Structured learning paths are not sold yet.",
    later: true,
  },
];

const privatePackages = ["€3,200", "€5,200", "€7,200"];

function GumroadCta({
  href,
  label,
  size = "default",
}: {
  href: string;
  label: string;
  size?: "default" | "lg";
}) {
  return (
    <Button size={size} className="gap-2" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
        <ArrowRight className="h-4 w-4" />
      </a>
    </Button>
  );
}

function BuySoloBundleButton({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <GumroadCta href={FUNDAMENTALS_CORE_GUMROAD_URL} label="Buy the Solo Bundle" size={size} />
  );
}

export default function Training() {
  const [interest, setInterest] = useState<TrainingInterestIntent | null>(null);
  const [quoteVariant, setQuoteVariant] = useState<TrainingQuoteVariant>("workshop");

  const openQuote = (variant: TrainingQuoteVariant = "workshop") => {
    setQuoteVariant(variant);
    setInterest("quote");
  };

  return (
    <Layout>
      <Seo
        path={TRAINING_PATH}
        title={TRAINING_TITLE}
        description={TRAINING_DESCRIPTION}
        image={TRAINING_OG_IMAGE_URL}
        jsonLd={trainingCourseJsonLd()}
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
              {TRAINING_H1}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              {TRAINING_INTRO_BEFORE}<strong>{TRAINING_INTRO_EMPHASIS}</strong>{TRAINING_INTRO_AFTER}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <BuySoloBundleButton size="lg" />
              <Button
                size="lg"
                variant="outline"
                onClick={() => openQuote()}
              >
                Request a private team workshop
              </Button>
            </div>
            <p className="text-sm font-medium mb-3">
              Solo Bundle <strong>€{TRAINING_LAUNCH_PRICE_EUR}</strong> at launch (until {TRAINING_LAUNCH_UNTIL_LABEL}, then €{TRAINING_POST_LAUNCH_PRICE_EUR}) · Team packs from <strong>€349</strong> · Private team workshops from <strong>€3,200</strong>. EUR excl. VAT.
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
              The Solo Bundle on Elsa 3.9.0 starts with Core: Modules 0-5, a lab kit you download and unzip, and Labs A-C (about 5 to 6 hours solo).
            </p>

            <h3 className="text-xl font-semibold mb-4">What you'll learn</h3>
            <h4 className="text-base font-semibold mb-3">Core</h4>
            <ul className="space-y-4 mb-8">
              {fundamentalsOutcomes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <h4 className="text-base font-semibold mb-3">Advanced Patterns (includes Approval Lite)</h4>
            <ul className="space-y-4 mb-8">
              {advancedPatternsOutcomes.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted-foreground mb-8">
              The bundle also includes Complete Labs D-H and Advanced Patterns AP0-AP2 with the Approval Lite lab.
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

            <h3 className="text-xl font-semibold mb-6">Self-paced</h3>

            <Card className="mb-6 border-primary/30">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">Solo Bundle</h3>
                      <Badge>Available</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Everything self-paced in one purchase, on Elsa 3.9.0.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>Core: Modules 0-5 with Labs A-C</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>Complete: Labs D-H</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>Advanced Patterns: AP0-AP2 with the Approval Lite lab</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>The Elsa 3.9.0 lab kit</span>
                      </li>
                    </ul>
                    <p className="text-sm font-medium mb-6">
                      €{TRAINING_LAUNCH_PRICE_EUR} at launch until {TRAINING_LAUNCH_UNTIL_LABEL}, then €{TRAINING_POST_LAUNCH_PRICE_EUR}. EUR excl. VAT.
                    </p>
                    <BuySoloBundleButton />
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
                      <h3 className="text-xl font-semibold">Team packs</h3>
                      <Badge>Available</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      One purchase for your whole team, with the same Solo Bundle content.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>Team 5: 5 seats, completion certificates, and 90 days of email Q&A.</span>
                      </li>
                      <li className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>Team 10: 10 seats, completion certificates, 90 days of email Q&A, plus a 60-minute live team Q&A.</span>
                      </li>
                    </ul>
                    <p className="text-sm font-medium mb-2">
                      Team 5 €349 · Team 10 €599.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      EUR excl. VAT. Pick Team 5 or Team 10 at checkout.
                    </p>
                    <GumroadCta href={FUNDAMENTALS_CORE_GUMROAD_URL} label="Buy a Team pack" />
                    <p className="text-sm text-muted-foreground mt-3">
                      Need 25+ seats? Team packs of 25 or more are by quote.{" "}
                      <Button variant="link" className="p-0 h-auto" onClick={() => openQuote("seat_quote")}>
                        Request a quote
                      </Button>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Mention the seat count in your message.
                    </p>
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
                      Private team workshops with a facilitator for your whole team. From
                      €3,200, EUR excl. VAT.
                    </p>
                    <div className="mb-6">
                      <h4 className="text-base font-semibold mb-2">
                        Approval Lite: self-paced in the Solo Bundle, or as a private workshop
                      </h4>
                      <p className="text-muted-foreground mb-3">
                        Approval Lite is part of Advanced Patterns (AP0 to AP2) and is included in the Solo Bundle and every Team pack. Work through it at your own pace after the Core labs: learn the approval decision tree (AP1), then build a small multi-role approval workflow with a reject and resubmit loop on the Elsa 3.9.0 lab kit (AP2). Plan for about 3 hours. Team 5 and Team 10 include completion certificates.
                      </p>
                      <p className="text-muted-foreground">
                        Prefer to learn it live? We also run Approval Lite as a half-day facilitated private workshop, on its own or after a Fundamentals workshop. Request a quote and mention &quot;Approval Lite&quot; in your message.
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => openQuote()}>
                      Request a private team workshop
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      Private quotes can include Fundamentals, Approval Lite, or both. Tell us which in your message.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {extraFormats.map((format) => (
                <Card key={format.title} className={format.later ? "opacity-80" : undefined}>
                  <CardContent className="p-6 flex gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <format.icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{format.title}</h3>
                        <Badge variant={format.later ? "secondary" : undefined}>
                          {format.later ? "Later" : "Available"}
                        </Badge>
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
                      Solo Bundle
                    </p>
                    <p className="text-2xl font-bold mb-2">€{TRAINING_LAUNCH_PRICE_EUR}</p>
                    <p className="text-sm text-muted-foreground">
                      Launch price until {TRAINING_LAUNCH_UNTIL_LABEL}, then €{TRAINING_POST_LAUNCH_PRICE_EUR} · Elsa 3.9.0
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Team packs
                    </p>
                    <p className="text-2xl font-bold mb-2">from €349</p>
                    <p className="text-sm text-muted-foreground">
                      Team 5 €349 · Team 10 €599 · 25+ seats by quote
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
                <p className="text-sm text-muted-foreground mb-8">EUR excl. VAT.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <BuySoloBundleButton />
                  <Button variant="outline" onClick={() => openQuote()}>
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
                Buy the Solo Bundle or a Team pack now, or leave your details and we’ll follow up about a private team workshop or a 25+ seat quote.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <BuySoloBundleButton size="lg" />
                <Button size="lg" variant="outline" onClick={() => openQuote()}>
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
        key={`${interest ?? "closed"}-${quoteVariant}`}
        open={interest !== null}
        intent={interest ?? "notify"}
        quoteVariant={quoteVariant}
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
