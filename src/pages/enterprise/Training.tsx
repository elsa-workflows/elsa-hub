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
import { ArrowRight, GraduationCap, Video, Users, BookOpen, Award, Mail } from "lucide-react";

const trainingFormats = [
  {
    icon: Video,
    title: "Courses",
    description: "Structured learning paths covering Elsa Workflows from fundamentals to advanced topics.",
  },
  {
    icon: Users,
    title: "Workshops",
    description: "Interactive, hands-on sessions focused on specific use cases and implementation patterns.",
  },
  {
    icon: BookOpen,
    title: "Self-Paced Learning",
    description: "On-demand materials your team can consume at their own pace.",
  },
  {
    icon: Award,
    title: "Certifications",
    description: "Validate your team's Elsa expertise with formal certification programs.",
  },
];

export default function Training() {
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
                <BreadcrumbPage>Training & Academy</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">Coming Soon</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Training & Academy
            </h1>
            <p className="text-xl text-muted-foreground">
              Educational resources and upskilling programs for teams 
              working with Elsa Workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Training Formats */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Training Formats
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {trainingFormats.map((format) => (
                <Card key={format.title}>
                  <CardContent className="p-6 flex gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <format.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{format.title}</h3>
                      <p className="text-muted-foreground text-sm">{format.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Service Providers
            </h2>
            <p className="text-muted-foreground mb-8">
              Training providers will be listed here as they become available.
            </p>
            <p className="text-sm text-muted-foreground">
              Interested in offering Elsa Workflows training?{" "}
              <a 
                href="mailto:info@skywalker-digital.com?subject=Training%20Provider%20Inquiry" 
                className="text-primary hover:underline"
              >
                Get in touch
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Interest CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Looking for Training?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                While formal training programs are being developed, you can reach out 
                to discuss your team's learning needs.
              </p>
              <Button size="lg" className="gap-2" asChild>
                <a href="mailto:info@skywalker-digital.com?subject=Training%20Inquiry">
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
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
