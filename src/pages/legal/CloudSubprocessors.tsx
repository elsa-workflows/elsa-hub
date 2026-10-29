import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import {
  CLOUD_DPA_PATH,
  CLOUD_DPA_TITLE,
  CLOUD_SUBPROCESSORS_DESCRIPTION,
  CLOUD_SUBPROCESSORS_PART_A,
  CLOUD_SUBPROCESSORS_PART_B,
  CLOUD_SUBPROCESSORS_PATH,
  CLOUD_SUBPROCESSORS_TITLE,
  CLOUD_SUBPROCESSORS_TRANSITIONAL_NOTE,
} from "@/lib/cloudDpa";

export default function CloudSubprocessors() {
  return (
    <Layout>
      <Seo
        title={`${CLOUD_SUBPROCESSORS_TITLE} | Elsa Workflows`}
        description={CLOUD_SUBPROCESSORS_DESCRIPTION}
        path={CLOUD_SUBPROCESSORS_PATH}
      />
      <div className="container max-w-3xl py-12 md:py-16">
        <p className="text-sm font-medium text-muted-foreground mb-2">Public terms · Elsa Cloud</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{CLOUD_SUBPROCESSORS_TITLE}</h1>
        <p className="text-muted-foreground mb-10">
          This list is Annex III of the{" "}
          <Link to={CLOUD_DPA_PATH} className="text-primary hover:underline">
            {CLOUD_DPA_TITLE}
          </Link>
          . See{" "}
          <Link to={`${CLOUD_DPA_PATH}#section-6`} className="text-primary hover:underline">
            section 6
          </Link>{" "}
          for how we notify changes and how you can object.
        </p>
        <section id="part-a" className="mb-10 scroll-mt-24">
          <LegalMarkdown markdown={CLOUD_SUBPROCESSORS_PART_A} />
        </section>
        <section id="part-b" className="mb-10 scroll-mt-24">
          <LegalMarkdown markdown={CLOUD_SUBPROCESSORS_PART_B} />
          <LegalMarkdown markdown={CLOUD_SUBPROCESSORS_TRANSITIONAL_NOTE} />
        </section>
      </div>
    </Layout>
  );
}
