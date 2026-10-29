import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import {
  CLOUD_DPA_ANNEXES,
  CLOUD_DPA_DESCRIPTION,
  CLOUD_DPA_INTRO,
  CLOUD_DPA_PATH,
  CLOUD_DPA_SECTIONS,
  CLOUD_DPA_TITLE,
  CLOUD_DPA_VERSION,
  CLOUD_SUBPROCESSORS_PATH,
} from "@/lib/cloudDpa";
import { CLOUD_TERMS_PATH } from "@/lib/cloudLegal";

export default function CloudDpa() {
  const all = [...CLOUD_DPA_SECTIONS, ...CLOUD_DPA_ANNEXES];
  return (
    <Layout>
      <Seo title={`${CLOUD_DPA_TITLE} | Elsa Workflows`} description={CLOUD_DPA_DESCRIPTION} path={CLOUD_DPA_PATH} />
      <div className="container max-w-3xl py-12 md:py-16">
        <p className="text-sm font-medium text-muted-foreground mb-2">Public terms · Elsa Cloud</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{CLOUD_DPA_TITLE}</h1>
        <p className="text-sm text-muted-foreground mb-8">{CLOUD_DPA_VERSION}</p>

        <section aria-label="Parties" className="mb-10">
          <LegalMarkdown markdown={CLOUD_DPA_INTRO} />
        </section>

        <nav aria-label="DPA navigation" className="mb-10">
          <p className="text-sm font-semibold mb-2">On this page</p>
          <ol className="space-y-1 text-sm">
            {all.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-primary hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {all.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mb-10 scroll-mt-24">
            <h2 id={`${section.id}-title`} className="text-xl font-semibold mb-3">
              {section.title}
            </h2>
            <LegalMarkdown markdown={section.body} />
          </section>
        ))}

        <section aria-label="Related pages" className="rounded-lg border p-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to={CLOUD_TERMS_PATH} className="text-primary hover:underline">
              Elsa Cloud Early Access Terms
            </Link>
            <Link to={CLOUD_SUBPROCESSORS_PATH} className="text-primary hover:underline">
              Sub-processors
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
