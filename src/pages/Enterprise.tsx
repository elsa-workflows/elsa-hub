import { Layout } from "@/components/layout/Layout";
import { ServiceCard, NeutralityDisclaimer } from "@/components/enterprise";

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

      {/* Expert Advisory & Engineering */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Expert Advisory & Engineering
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              title="Elsa Workflows Expert Services"
              description="Direct access to deep Elsa expertise. Architecture review, workflow design, production troubleshooting, and hands-on pairing."
              provider="Skywalker Digital"
              href="/enterprise/expert-services"
            />
          </div>
        </div>
      </section>

      {/* Enterprise Docker Images */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Enterprise Docker Images
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              title="Enterprise Docker Images"
              description="Production-grade container images for Elsa Workflows with regular updates and documentation."
              provider="Skywalker Digital"
              href="/enterprise/docker-images"
              tag="Coming Soon"
              comingSoon
            />
          </div>
        </div>
      </section>

      {/* Training & Academy */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Training & Academy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              title="Training & Academy"
              description="Courses, workshops, and educational resources for teams working with Elsa Workflows."
              href="/enterprise/training"
              tag="Coming Soon"
              comingSoon
            />
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
