import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { CLOUD_PRIVACY_PAGE, CLOUD_PRIVACY_PATH, CLOUD_PRIVACY_SECTIONS } from "@/lib/cloudPrivacy";

export default function CloudPrivacy() {
  const { hero, intro, contact, meta, related } = CLOUD_PRIVACY_PAGE;

  return (
    <Layout>
      <Seo title={meta.title} description={meta.description} path={CLOUD_PRIVACY_PATH} />
      <div className="container max-w-3xl py-12 md:py-16">
        <p className="text-sm font-medium text-muted-foreground mb-2">{hero.eyebrow}</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{hero.title}</h1>
        <p className="text-lg text-muted-foreground mb-2">{hero.lede}</p>
        <p className="text-sm text-muted-foreground mb-8">{hero.note}</p>

        <dl aria-label={hero.factsLabel} className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border p-4 mb-10">
          {hero.facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{fact.label}</dt>
              <dd className="text-sm font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <nav aria-label={CLOUD_PRIVACY_PAGE.navLabel} className="mb-10">
          <p className="text-sm font-semibold mb-2">On this page</p>
          <ol className="space-y-1 text-sm">
            {CLOUD_PRIVACY_SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-primary hover:underline">
                  {section.number} {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-labelledby="cloud-privacy-intro" className="mb-10">
          <p className="text-sm font-medium text-muted-foreground mb-1">{intro.eyebrow}</p>
          <h2 id="cloud-privacy-intro" className="text-xl font-semibold mb-3">{intro.title}</h2>
          <p className="mb-3">{intro.body}</p>
          <p className="text-sm text-muted-foreground">{intro.caveat}</p>
        </section>

        {CLOUD_PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mb-10 scroll-mt-24">
            <h2 id={`${section.id}-title`} className="text-xl font-semibold mb-1">
              <span className="text-muted-foreground mr-2">{section.number}</span>
              {section.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">{section.summary}</p>
            <ol className="list-decimal pl-6 space-y-2">
              {section.points.map((point, index) => (
                <li key={`${section.id}-${index}`}>{point}</li>
              ))}
            </ol>
          </section>
        ))}

        <section aria-label="Related pages" className="rounded-lg border p-6 mb-10">
          <div className="flex flex-wrap gap-4 text-sm">
            {related.map((link) => (
              <Link key={link.href} to={link.href} className="text-primary hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="cloud-privacy-contact" className="rounded-lg border p-6">
          <p className="text-sm font-medium text-muted-foreground mb-1">{contact.eyebrow}</p>
          <h2 id="cloud-privacy-contact" className="text-xl font-semibold mb-2">{contact.title}</h2>
          <p className="mb-4">{contact.body}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="mailto:hello@valence.works" className="text-primary hover:underline">hello@valence.works</a>
            <Link to={contact.related.to} className="text-primary hover:underline">
              {contact.related.label}
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
