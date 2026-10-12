import { ArrowRight, ArrowUpRight, BookOpen, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import {
  ELSA4_FOUNDATION_SOURCE_URL,
  ELSA4_PREVIEW_DESCRIPTION,
  ELSA4_PREVIEW_DOCS_URL,
  ELSA4_PREVIEW_GUIDES,
  ELSA4_PREVIEW_H1,
  ELSA4_PREVIEW_INTRO,
  ELSA4_PREVIEW_NOTES,
  ELSA4_PREVIEW_PATH,
  ELSA4_PREVIEW_SECTIONS,
  ELSA4_PREVIEW_TITLE,
} from "@/lib/elsa4Preview";

export default function Elsa4Preview() {
  return (
    <Layout>
      <Seo
        path={ELSA4_PREVIEW_PATH}
        title={ELSA4_PREVIEW_TITLE}
        description={ELSA4_PREVIEW_DESCRIPTION}
      />

      <div>
        <section className="border-b border-border/60 bg-surface-subtle">
          <div className="container py-16 md:py-24">
            <div className="max-w-3xl">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.14em] text-brand">
                Elsa 4 · Preview
              </p>
              <h1 className="mb-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                {ELSA4_PREVIEW_H1}
              </h1>
              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {ELSA4_PREVIEW_INTRO}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" asChild>
                  <a href={ELSA4_PREVIEW_DOCS_URL} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-4 w-4" />
                    Read preview docs
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <a href={ELSA4_FOUNDATION_SOURCE_URL} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                    View source
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-brand">
                Engine, extensions, and visual designer
              </p>
              <h2 className="mb-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Start with the parts documented today.
              </h2>
              <p className="text-lg text-muted-foreground">
                Explore the Essentials, Extensions, and Studio parts of the Foundation repository, with guides to help you get started.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {ELSA4_PREVIEW_SECTIONS.map((section) => (
                <article key={section.title} className="flex h-full flex-col rounded-xl border border-border bg-card p-6 md:p-7">
                  <h3 className="mb-3 text-xl font-semibold">{section.title}</h3>
                  <p className="mb-6 flex-1 leading-relaxed text-muted-foreground">{section.description}</p>
                  <a
                    href={section.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    Read {section.title} docs
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  {"sourceHref" in section && (
                    <a
                      href={section.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      Browse Studio source
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-surface-subtle py-16 md:py-24">
          <div className="container">
            <div className="mb-10 max-w-2xl">
              <h2 className="mb-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Build your first local workflow
              </h2>
              <p className="text-lg text-muted-foreground">
                Start with the local setup, then create and run a small workflow. Each guide identifies the preview revisions it covers.
              </p>
            </div>

            <ul className="grid gap-4 md:grid-cols-3">
              {ELSA4_PREVIEW_GUIDES.map((guide) => (
                <li key={guide.title} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-2 text-lg font-semibold">{guide.title}</h3>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{guide.description}</p>
                  <a
                    href={guide.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    Open guide
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-brand">
                  Preview scope
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                  Check the version behind each example.
                </h2>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                <ul className="space-y-5">
                  {ELSA4_PREVIEW_NOTES.map((note) => (
                    <li key={note} className="flex gap-3 leading-relaxed text-muted-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 border-t border-border pt-6">
                  <a
                    href={ELSA4_PREVIEW_GUIDES[2].href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    Contribute documentation
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Button variant="ghost" className="gap-2 px-0" asChild>
                <a href={ELSA4_PREVIEW_DOCS_URL} target="_blank" rel="noopener noreferrer">
                  Browse all Elsa 4 preview docs
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
