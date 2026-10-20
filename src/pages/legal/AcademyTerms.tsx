import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import {
  ACADEMY_TERMS_DESCRIPTION,
  ACADEMY_TERMS_PATH,
  ACADEMY_TERMS_SECTIONS,
  ACADEMY_TERMS_TITLE,
  ACADEMY_TERMS_VERSION,
} from "@/lib/academyLegal";

export default function AcademyTerms() {
  return (
    <Layout>
      <Seo
        title={`${ACADEMY_TERMS_TITLE} | Elsa Workflows`}
        description={ACADEMY_TERMS_DESCRIPTION}
        path={ACADEMY_TERMS_PATH}
      />
      <div className="container max-w-3xl py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{ACADEMY_TERMS_TITLE}</h1>
        <p className="text-sm text-muted-foreground mb-10">Version {ACADEMY_TERMS_VERSION}</p>
        {ACADEMY_TERMS_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mb-10 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body}</ReactMarkdown>
            </div>
          </section>
        ))}
      </div>
    </Layout>
  );
}
