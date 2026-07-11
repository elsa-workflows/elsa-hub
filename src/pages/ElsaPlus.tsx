import { Seo } from "@/components/Seo";
import {
  Users,
  Cloud,
  Container,
  GraduationCap,
  Package,
  FileCode2,
  Handshake,
  Boxes,
  LayoutDashboard,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  ElsaPlusIcon,
  ElsaPlusSectionCard,
  ElsaPlusDisclaimer,
} from "@/components/elsa-plus";

const servicesAndSupport = [
  {
    title: "Expert Advisory, Engineering & Support",
    description:
      "Architecture review, workflow design, production troubleshooting, priority support, and hands-on pairing with Elsa experts.",
    icon: Users,
    href: "/elsa-plus/expert-services",
  },
];

const runtimeAndOperations = [
  {
    title: "Elsa Platform",
    description:
      "Control plane for Elsa: declarative manifests, package governance, runtime composition, and a deterministic deploy loop with full history.",
    icon: LayoutDashboard,
    href: "/elsa-plus/platform",
    badge: "In development",
  },
  {
    title: "Runtime Builder",
    description:
      "Visually compose an Elsa runtime — pick an image, enable capabilities, configure settings, and preview a complete Docker deployment bundle.",
    icon: Boxes,
    href: "/elsa-plus/runtime-builder",
    badge: "Preview",
  },
  {
    title: "Docker Images",
    description:
      "Production-oriented Elsa containers from Valence Works — server, studio, and combined images. Free to try; not yet a supported distribution.",
    icon: Container,
    href: "/elsa-plus/docker-images",
    badge: "Early Preview",
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
      <Seo path="/elsa-plus" title="Elsa+ — Optional provider-backed offerings around Elsa Workflows" description="Elsa+ lists optional products and services around Elsa Workflows from independent providers: Early Preview Docker images, expert services, training, and more. Elsa Workflows itself remains open source and vendor-neutral." />
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 flex items-center justify-center gap-3">
              <span>Elsa</span>
              <ElsaPlusIcon size="hero" />
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Optional provider-backed products and services around Elsa Workflows.
            </p>
            <div className="bg-muted/50 border rounded-lg p-6 text-left max-w-2xl mx-auto">
              <p className="text-muted-foreground leading-relaxed">
                Elsa Workflows is open source and vendor-neutral. Elsa+ lists optional
                offerings from independent providers — each offering identifies its
                own provider, licence terms, and support model.
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
