import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import {
  CLOUD_PRIVACY_NOTICE_URL,
  CLOUD_TERMS_CONTACT,
  CLOUD_TERMS_CONTACT_EMAIL,
  CLOUD_TERMS_DESCRIPTION,
  CLOUD_TERMS_HERO,
  CLOUD_TERMS_INTRO,
  CLOUD_TERMS_PATH,
  CLOUD_TERMS_SECTIONS,
  CLOUD_TERMS_TITLE,
} from "@/lib/cloudLegal";

export default function CloudTerms() {
  return (
    <Layout>
      <Seo title={`${CLOUD_TERMS_TITLE} | Elsa Workflows`} description={CLOUD_TERMS_DESCRIPTION} path={CLOUD_TERMS_PATH} />
      <div className="container max-w-3xl py-12 md:py-16">
        <p className="text-sm font-medium text-muted-foreground mb-2">{CLOUD_TERMS_HERO.eyebrow}</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{CLOUD_TERMS_TITLE}</h1>
        <p className="text-lg text-muted-foreground mb-2">{CLOUD_TERMS_HERO.lede}</p>
        <p className="text-sm text-muted-foreground mb-8">{CLOUD_TERMS_HERO.note}</p>

        <dl aria-label={CLOUD_TERMS_HERO.factsLabel} className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border p-4 mb-10">
          {CLOUD_TERMS_HERO.facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{fact.label}</dt>
              <dd className="text-sm font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <nav aria-label="Terms navigation" className="mb-10">
          <p className="text-sm font-semibold mb-2">On this page</p>
          <ol className="space-y-1 text-sm">
            {CLOUD_TERMS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-primary hover:underline">
                  {section.number} {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-labelledby="cloud-terms-intro" className="mb-10">
          <p className="text-sm font-medium text-muted-foreground mb-1">{CLOUD_TERMS_INTRO.eyebrow}</p>
          <h2 id="cloud-terms-intro" className="text-xl font-semibold mb-3">{CLOUD_TERMS_INTRO.title}</h2>
          <p className="mb-3">{CLOUD_TERMS_INTRO.body}</p>
          <p className="text-sm text-muted-foreground">{CLOUD_TERMS_INTRO.caveat}</p>
        </section>

        {CLOUD_TERMS_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mb-10 scroll-mt-24">
            <h2 id={`${section.id}-title`} className="text-xl font-semibold mb-1">
              <span className="text-muted-foreground mr-2">{section.number}</span>
              {section.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{section.summary}</p>
            <ol className="list-decimal pl-6 space-y-2">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
            {section.links && (
              <div className="flex flex-wrap gap-4 text-sm mt-3">
                {section.links.map((link) =>
                  link.href.startsWith("/") ? (
                    <Link key={link.href} to={link.href} className="text-primary hover:underline">
                      {link.label}
                    </Link>
                  ) : (
                    <a key={link.href} href={link.href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  ),
                )}
              </div>
            )}
          </section>
        ))}

        <section aria-labelledby="cloud-terms-contact" className="rounded-lg border p-6">
          <p className="text-sm font-medium text-muted-foreground mb-1">{CLOUD_TERMS_CONTACT.eyebrow}</p>
          <h2 id="cloud-terms-contact" className="text-xl font-semibold mb-2">{CLOUD_TERMS_CONTACT.title}</h2>
          <p className="mb-4">{CLOUD_TERMS_CONTACT.body}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href={`mailto:${CLOUD_TERMS_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CLOUD_TERMS_CONTACT_EMAIL}
            </a>
            <a href={CLOUD_PRIVACY_NOTICE_URL} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Read the privacy notice
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}
