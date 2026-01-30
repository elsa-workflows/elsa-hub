import {
  Users,
  Cloud,
  Container,
  GraduationCap,
  Package,
  FileCode2,
  Handshake,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  ElsaPlusIcon,
  ElsaPlusSectionCard,
  ElsaPlusDisclaimer,
} from "@/components/elsa-plus";

const servicesAndSupport = [
  {
    title: "Expert Advisory & Engineering",
    description:
      "Architecture review, workflow design, production troubleshooting, and hands-on pairing with Elsa experts.",
    icon: Users,
    href: "/elsa-plus/expert-services",
  },
  {
    title: "Cloud & Managed Services",
    description:
      "Managed workflow engine in the cloud with enterprise-grade hosting and seamless management.",
    icon: Cloud,
    href: "/elsa-plus/cloud-services",
    comingSoon: true,
  },
];

const runtimeAndOperations = [
  {
    title: "Production Docker Images",
    description:
      "Production-ready container images with regular updates, security patches, and documentation.",
    icon: Container,
    href: "/elsa-plus/production-docker",
    comingSoon: true,
  },
];

const learningAndEnablement = [
  {
    title: "Training & Academy",
    description:
      "Courses, workshops, and educational resources for teams working with Elsa Workflows.",
    icon: GraduationCap,
    href: "/elsa-plus/training",
    comingSoon: true,
  },
];

const marketplace = [
  {
    title: "Premium Modules",
    description:
      "Extend Elsa with powerful modules providing additional activities, connectors, and integrations.",
    icon: Package,
    comingSoon: true,
  },
  {
    title: "Workflow Templates",
    description:
      "Battle-tested workflow templates for common business processes and integration patterns.",
    icon: FileCode2,
    comingSoon: true,
  },
  {
    title: "Partners & Services",
    description:
      "Connect with certified developers, consultants, and development teams.",
    icon: Handshake,
    comingSoon: true,
  },
];

export default function ElsaPlus() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 flex items-center justify-center gap-3">
              <span>Elsa</span>
              <ElsaPlusIcon size="hero" />
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A growing ecosystem of services, tooling, and extensions around
              Elsa Workflows.
            </p>
            <div className="bg-muted/50 border rounded-lg p-6 text-left max-w-2xl mx-auto">
              <p className="text-muted-foreground leading-relaxed">
                The core workflow engine remains fully open source and
                community-driven. Elsa+ adds optional services and tooling
                around it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services & Support */}
      <ElsaPlusSectionCard
        title="Services & Support"
        intro="Professional services to help teams design, build, and operate workflows with confidence."
        cards={servicesAndSupport}
      />

      {/* Runtime & Operations */}
      <ElsaPlusSectionCard
        title="Runtime & Operations"
        intro="Operational tooling for teams running Elsa Workflows in production environments."
        cards={runtimeAndOperations}
        className="bg-surface-subtle"
      />

      {/* Learning & Enablement */}
      <ElsaPlusSectionCard
        title="Learning & Enablement"
        intro="Resources to help teams deepen their understanding of Elsa Workflows and build better solutions."
        cards={learningAndEnablement}
      />

      {/* Marketplace */}
      <ElsaPlusSectionCard
        title="Elsa+ Marketplace"
        intro="A growing marketplace of extensions, templates, and services built around Elsa Workflows."
        cards={marketplace}
        className="bg-surface-subtle"
      />

      {/* Disclaimer */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl">
          <ElsaPlusDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
