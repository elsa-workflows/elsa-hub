import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ELSA_CLOUD_PATH } from "@/lib/elsaCloud";

export const CLOUD_LEGAL_CONTACT_EMAIL = "hello@valence.works";
export const CLOUD_LEGAL_CONTACT_HREF = `mailto:${CLOUD_LEGAL_CONTACT_EMAIL}`;

export type CloudLegalFact = { label: string; value: ReactNode };
export type CloudLegalNavItem = { href: string; label: string };
export type CloudLegalSection = {
  id: string;
  number: string;
  title: string;
  summary: string;
  points: ReactNode[];
};

type CloudLegalDocumentProps = {
  meta: { title: string; description: string; path: string };
  hero: {
    eyebrow: string;
    title: string;
    lede: ReactNode;
    note: ReactNode;
    facts: CloudLegalFact[];
    factsLabel: string;
  };
  name: string;
  navLabel: string;
  id: string;
  intro: { eyebrow: string; title: string; body: ReactNode; caveat: ReactNode };
  sections?: CloudLegalSection[];
  related: CloudLegalNavItem[];
  contact: {
    eyebrow: string;
    title: string;
    body: ReactNode;
    related: { label: string; to: string };
  };
  children?: ReactNode;
  nav?: CloudLegalNavItem[];
};

export function CloudLegalSectionArticle({
  section,
  label,
}: {
  section: CloudLegalSection;
  label: string;
}) {
  const titleId = `${section.id}-title`;
  return (
    <article className="space-y-4 border-t pt-8" id={section.id} aria-labelledby={titleId}>
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.number} · {label}
        </p>
        <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
          {section.title}
        </h2>
        <p className="text-muted-foreground">{section.summary}</p>
      </header>
      <ol className="space-y-4">
        {section.points.map((point, index) => (
          <li key={index} className="flex gap-3 text-sm leading-relaxed md:text-base">
            <span className="mt-0.5 w-8 shrink-0 font-mono text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">{point}</div>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function CloudLegalDocument({
  meta,
  hero,
  name,
  navLabel,
  id,
  intro,
  sections = [],
  related,
  contact,
  children,
  nav,
}: CloudLegalDocumentProps) {
  const toc = [...(nav ?? sections.map((section) => ({ href: `#${section.id}`, label: `${section.number} ${section.title}` }))), ...related];
  const introTitleId = `${id}-intro-title`;
  const contactTitleId = `${id}-contact-title`;

  return (
    <Layout>
      <Seo path={meta.path} title={meta.title} description={meta.description} noIndex />
      <section className="pt-8 pb-4">
        <div className="container">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/elsa-plus">Elsa+</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={ELSA_CLOUD_PATH}>Elsa Cloud</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{hero.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      <section className="pb-12 md:pb-16" id={id} aria-label={name}>
        <div className="container grid gap-10 lg:grid-cols-[16rem_minmax(0,48rem)] lg:gap-16">
          <aside className="lg:pt-2" aria-label={navLabel}>
            <div className="lg:sticky lg:top-24 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              <nav className="flex flex-col gap-2 text-sm">
                {toc.map((item) =>
                  item.href.startsWith("/") ? (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.href}
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  ),
                )}
              </nav>
            </div>
          </aside>

          <div className="space-y-10">
            <header className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">{hero.eyebrow}</p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{hero.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">{hero.lede}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{hero.note}</p>
              <ol className="grid gap-3 sm:grid-cols-2" aria-label={hero.factsLabel}>
                {hero.facts.map((fact, index) => (
                  <li key={fact.label} className="rounded-lg border bg-card p-4">
                    <p className="text-xs font-mono text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-1 font-semibold">{fact.label}</p>
                    <p className="text-sm text-muted-foreground">{fact.value}</p>
                  </li>
                ))}
              </ol>
            </header>

            <section className="space-y-3" aria-labelledby={introTitleId}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {intro.eyebrow}
              </p>
              <h2 id={introTitleId} className="text-2xl font-semibold tracking-tight">
                {intro.title}
              </h2>
              <p className="leading-relaxed">{intro.body}</p>
              <p className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">{intro.caveat}</p>
            </section>

            {children ??
              sections.map((section) => (
                <CloudLegalSectionArticle key={section.id} section={section} label={name} />
              ))}

            <section className="space-y-4 border-t pt-8" aria-labelledby={contactTitleId}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {contact.eyebrow}
              </p>
              <h2 id={contactTitleId} className="text-2xl font-semibold tracking-tight">
                {contact.title}
              </h2>
              <p className="leading-relaxed">{contact.body}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild>
                  <a href={CLOUD_LEGAL_CONTACT_HREF}>{CLOUD_LEGAL_CONTACT_EMAIL}</a>
                </Button>
                <Link to={contact.related.to} className="text-sm text-primary hover:underline">
                  {contact.related.label}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>
    </Layout>
  );
}
