import { Link } from "react-router-dom";
import { Check, ArrowRight, Workflow, Zap, Code2, Puzzle, Eye, Shield, Github, BookOpen, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
const benefits = ["Build complex workflows with .NET", "Visual workflow designer included", "Extensible activity system", "Long-running workflow support", "Open source & MIT licensed"];
const features = [{
  icon: Workflow,
  title: "Visual Designer",
  description: "Design workflows visually with an intuitive drag-and-drop interface. No code required for simple flows."
}, {
  icon: Code2,
  title: ".NET Native",
  description: "Built from the ground up for .NET. Leverage your existing C# skills and integrate seamlessly with your stack."
}, {
  icon: Puzzle,
  title: "Extensible",
  description: "Create custom activities, extend the designer, and integrate with any system through a powerful plugin architecture."
}, {
  icon: Zap,
  title: "High Performance",
  description: "Optimized for speed and efficiency. Handle thousands of concurrent workflows with minimal resource usage."
}, {
  icon: Eye,
  title: "Full Observability",
  description: "Monitor workflow execution in real-time. Debug, trace, and analyze every step of your workflows."
}, {
  icon: Shield,
  title: "Enterprise Ready",
  description: "Built for production. Supports clustering, persistence, and scales from small apps to enterprise systems."
}];
const ecosystemLinks = [{
  icon: Github,
  title: "GitHub",
  description: "Explore the source code and contribute",
  href: "https://github.com/elsa-workflows/elsa-core"
}, {
  icon: BookOpen,
  title: "Documentation",
  description: "Learn how to get started and build workflows",
  href: "https://v3.elsaworkflows.io/"
}, {
  icon: MessageCircle,
  title: "Community",
  description: "Join our Discord and connect with developers",
  href: "https://discord.gg/hhChk5H472"
}];
export default function Home() {
  return <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 -z-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10" />

        <div className="container py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Elsa 3.5 is now available
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
              The Workflow Engine for{" "}
              <span className="text-gradient">.NET</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{
            animationDelay: "0.1s"
          }}>
              Build powerful workflow-driven applications with Elsa. Design visually,
              code in C#, and scale to any size.
            </p>

            {/* Benefits */}
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10 animate-fade-in-up" style={{
            animationDelay: "0.2s"
          }}>
              {benefits.map(benefit => <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {benefit}
                </li>)}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{
            animationDelay: "0.3s"
          }}>
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link to="/get-started">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="https://v3.elsaworkflows.io/" target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4" />
                  Documentation
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-surface-subtle">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Elsa Workflows?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build, run, and manage workflows in your .NET applications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <Card key={feature.title} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card animate-fade-in-up" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join the Ecosystem
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our resources and become part of the growing Elsa community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {ecosystemLinks.map((link, index) => <a key={link.title} href={link.href} target="_blank" rel="noopener noreferrer" className="group block animate-fade-in-up" style={{
            animationDelay: `${index * 0.1}s`
          }}>
                <Card className="h-full border bg-surface-subtle hover:border-primary/50 transition-all hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
                      <link.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                      {link.title}
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </CardContent>
                </Card>
              </a>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-surface-subtle">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start building workflow-driven applications today. It's free, open source,
              and backed by an active community.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link to="/get-started">
                  Get Started Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link to="/elsa-plus">
                  Explore Elsa+
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>;
}