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
import { NeutralityDisclaimer } from "@/components/enterprise";
import { ArrowRight, Check, Container, RefreshCw, BookOpen, Bell } from "lucide-react";

const features = [
  {
    icon: Container,
    title: "Production-Ready Images",
    description: "Optimized container images built specifically for running Elsa Workflows in production environments.",
  },
  {
    icon: RefreshCw,
    title: "Regular Updates",
    description: "Receive timely updates with the latest Elsa versions and security patches.",
  },
  {
    icon: BookOpen,
    title: "Documentation & Guidance",
    description: "Comprehensive documentation for deployment, configuration, and best practices.",
  },
];

export default function DockerImages() {
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
                <BreadcrumbPage>Docker Images</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Badge variant="secondary">Provided by Skywalker Digital</Badge>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Enterprise Docker Images
            </h1>
            <p className="text-xl text-muted-foreground">
              Production-grade container images for Elsa Workflows, 
              maintained and supported by Skywalker Digital.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              What's Included
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interest CTA */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Interested?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Enterprise Docker Images are coming soon. Get in touch to be notified 
                when they become available or to discuss your requirements.
              </p>
              <Button size="lg" className="gap-2" asChild>
                <a href="mailto:info@skywalker-digital.com?subject=Enterprise%20Docker%20Images%20-%20Interest">
                  Notify Me
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Neutrality Disclaimer */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
