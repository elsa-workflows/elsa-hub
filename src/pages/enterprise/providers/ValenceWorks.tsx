import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { NeutralityDisclaimer, AvailabilityDisclaimer } from "@/components/enterprise";
import { PurchaseBundleDialog } from "@/components/organization/PurchaseBundleDialog";
import { IntroCallIntakeDialog } from "@/components/enterprise/IntroCallIntakeDialog";
import { NewsletterSubscribeDialog } from "@/components/newsletter";
import { useCreditBundles } from "@/hooks/useCreditBundles";
import { toast } from "sonner";
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
  CreditCard,
  Loader2,
  Phone,
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
  "Teams using Elsa Workflows in real applications",
  "Organizations preparing for or running Elsa in production",
  "Developers facing non-trivial workflow, orchestration, or architectural challenges",
];

const notForWhom = [
  "Hobby projects or casual experimentation",
  "General .NET mentoring unrelated to Elsa Workflows",
  "Staff augmentation or long-term team replacement",
];

const engagementFormats = [
  { icon: Video, label: "Video calls" },
  { icon: MessageSquare, label: "Async reviews and feedback" },
  { icon: Users, label: "Pair programming" },
  { icon: Search, label: "Short investigations or debugging sessions" },
];

const howWeWork = [
  "Engagements are collaborative and focused on enablement, not replacement",
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

interface DialogConfig {
  open: boolean;
  title: string;
  description: string;
  buttonText: string;
  successMessage: string;
}

export default function ValenceWorks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [introCallDialogOpen, setIntroCallDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    open: false,
    title: "",
    description: "",
    buttonText: "Notify Me",
    successMessage: "You're on the list!",
  });
  const { data: bundles, isLoading: bundlesLoading } = useCreditBundles();

  const openDialog = (type: "getStarted" | "questions") => {
    const configs = {
      getStarted: {
        title: "Get Started",
        description: "Register your interest and we'll be in touch to discuss your needs.",
        buttonText: "Register Interest",
        successMessage: "Thanks! We'll reach out to discuss how we can help.",
      },
      questions: {
        title: "Have Questions?",
        description: "Leave your details and we'll reach out to answer your questions.",
        buttonText: "Submit",
        successMessage: "Thanks! We'll be in touch to answer your questions.",
      },
    };
    setDialogConfig({ open: true, ...configs[type] });
  };

  // Handle URL params on mount (payment status and bundleId for returning from login)
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const bundleId = searchParams.get("bundleId");
    
    if (paymentStatus === "cancelled") {
      toast.info("Payment cancelled", {
        description: "Your payment was cancelled. No charges were made.",
      });
      setSearchParams((prev) => {
        prev.delete("payment");
        return prev;
      });
    }
    
    if (bundleId) {
      setSelectedBundleId(bundleId);
      setPurchaseDialogOpen(true);
      setSearchParams((prev) => {
        prev.delete("bundleId");
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  const handleBundleClick = (bundleId: string) => {
    setSelectedBundleId(bundleId);
    setPurchaseDialogOpen(true);
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

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
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus/expert-services">Expert Services</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Valence Works</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Valence Works
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Direct access to the creator and core maintainer of Elsa Workflows.
            </p>
            <p className="text-lg text-muted-foreground">
              Get focused, senior-level guidance to design, extend, and operate Elsa Workflows 
              in real-world systems. Whether you need architectural clarity, hands-on pairing, 
              or help unblocking production issues,{" "}
              <a href="https://www.valence.works/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">Valence Works</a>{" "}
              provides expert support grounded in deep knowledge of Elsa's internals and real-world usage.
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
              <div>
                <h3 className="text-lg font-semibold mb-6 text-foreground">
                  This service is intended for:
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
              <div>
                <h3 className="text-lg font-semibold mb-6 text-foreground">
                  This service is not intended for:
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
              The following are common areas of engagement. This list is illustrative, not exhaustive.
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
              <div>
                <h3 className="text-xl font-semibold mb-6">Service Credits</h3>
                <p className="text-muted-foreground mb-6">
                  All services are delivered using prepaid Service Credits, allowing flexible use 
                  across different engagement types.
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
                    <span>Credits valid for 24 months</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <AvailabilityDisclaimer variant="compact" />
                </div>
              </div>
              
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
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Service Credit Bundles
            </h2>
            
            {bundlesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {bundles?.filter(b => b.billing_type !== "recurring").map((bundle, index) => {
                    const isPopular = index === 1;
                    return (
                      <Card
                        key={bundle.id}
                        onClick={() => handleBundleClick(bundle.id)}
                        className={cn(
                          "relative overflow-visible transition-all cursor-pointer",
                          isPopular
                            ? "border-primary shadow-lg md:-mt-2 md:mb-2 hover:shadow-xl"
                            : "hover:shadow-md hover:border-primary/50"
                        )}
                      >
                        {isPopular && (
                          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground">
                            Popular
                          </Badge>
                        )}
                        <CardHeader className="text-center pb-2">
                          <CardTitle className="text-lg">{bundle.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                          <div className="mb-2">
                            <span className="text-3xl font-bold">
                              {formatPrice(bundle.price_cents, bundle.currency)}
                            </span>
                          </div>
                          <p className="text-xl font-semibold text-primary mb-2">
                            {bundle.hours} Service Credits
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {bundle.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="mt-8 text-center text-sm text-muted-foreground space-y-1">
                  <p>All prices exclude VAT where applicable.</p>
                  <p>Service Credits are prepaid and non-refundable.</p>
                  <p>Discounts apply only through bundles.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Retained Advisory */}
      {(() => {
        const subscriptionBundle = bundles?.find(b => b.billing_type === "recurring");
        if (!subscriptionBundle) return null;
        
        return (
          <section className="py-16 md:py-24">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <Card 
                  className="border-2 border-primary/30 cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                  onClick={() => handleBundleClick(subscriptionBundle.id)}
                >
                  <CardContent className="p-8 md:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div>
                        <Badge variant="secondary" className="mb-4">Subscription</Badge>
                        <h2 className="text-2xl md:text-3xl font-bold mb-4">
                          Retained Advisory
                        </h2>
                        <p className="text-muted-foreground mb-6">
                          For teams running Elsa Workflows in production who want continuity, 
                          retained context, and priority access.
                        </p>
                        <div className="text-3xl font-bold">
                          {formatPrice(subscriptionBundle.price_cents, subscriptionBundle.currency)}
                          <span className="text-lg font-normal text-muted-foreground">/{subscriptionBundle.recurring_interval}</span>
                        </div>
                      </div>
                      <div>
                        <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{subscriptionBundle.monthly_hours} Service Credits per month</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Priority scheduling</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Asynchronous Q&A access</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Continuity and retained architectural context</span>
                          </li>
                        </ul>
                        <div className="mt-6 text-sm text-muted-foreground space-y-1">
                          <p>Unused credits expire monthly.</p>
                          <p>Additional Service Credits can be purchased separately.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Not Sure Where to Start - Intro Call Section */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Not Sure Where to Start?
            </h2>
            <p className="text-muted-foreground mb-8">
              If you're considering expert support but want to sanity-check your approach or discuss 
              whether we're a good fit, you can book a short introductory call.
            </p>
            
            <div className="bg-background rounded-lg border p-6 md:p-8 text-left mb-8">
              <p className="text-muted-foreground mb-4">
                This 30-minute session is intended to:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Clarify your use case and challenges</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Answer high-level questions about Elsa Workflows</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Recommend the most appropriate engagement or service bundle</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground border-t pt-4">
                This session does not include hands-on problem solving, code review, or implementation.
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={() => setIntroCallDialogOpen(true)}
              className="gap-2"
            >
              <Phone className="h-4 w-4" />
              Book a 30-Minute Intro Call
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Limited availability. Intended for serious production or pre-production use cases.
            </p>
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
                  Urgent or after-hours support for production-blocking issues may be available 
                  on a best-effort basis and is billed at 2× the standard hourly rate, subject to availability.
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
                  onClick={() => openDialog("getStarted")}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => openDialog("questions")}
                >
                  Have Questions?
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

      {/* Purchase Dialog */}
      <PurchaseBundleDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        preSelectedBundleId={selectedBundleId}
      />

      {/* Intro Call Intake Dialog */}
      <IntroCallIntakeDialog
        open={introCallDialogOpen}
        onOpenChange={setIntroCallDialogOpen}
      />

      {/* Newsletter Dialog */}
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
