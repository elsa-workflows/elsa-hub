import { Users, Container, GraduationCap, Cloud } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { CategoryCard, NeutralityDisclaimer } from "@/components/enterprise";

const categories = [
  {
    title: "Expert Advisory & Engineering",
    description:
      "Architecture review, workflow design, production troubleshooting, and hands-on pairing with Elsa experts.",
    icon: Users,
    href: "/enterprise/expert-services",
  },
  {
    title: "Enterprise Docker Images",
    description:
      "Production-grade container images with regular updates, security patches, and documentation.",
    icon: Container,
    href: "/enterprise/docker-images",
    comingSoon: true,
  },
  {
    title: "Cloud & Managed Services",
    description:
      "Managed workflow engine in the cloud or bring your own. Enterprise-grade hosting with seamless management.",
    icon: Cloud,
    href: "/enterprise/cloud-services",
    comingSoon: true,
  },
  {
    title: "Training & Academy",
    description:
      "Courses, workshops, and educational resources for teams working with Elsa Workflows.",
    icon: GraduationCap,
    href: "/enterprise/training",
    comingSoon: true,
  },
];

export default function Enterprise() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Professional Services Ecosystem
            </h1>
            <p className="text-xl text-muted-foreground">
              Elsa Workflows is open source (MIT license) and freely available.
              Commercial services are provided by independent companies to help
              organizations succeed with their workflow implementations.
            </p>
          </div>
        </div>
      </section>

      {/* Category Cards Grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.href}
                title={category.title}
                description={category.description}
                icon={category.icon}
                href={category.href}
                comingSoon={category.comingSoon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Neutrality Disclaimer */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
