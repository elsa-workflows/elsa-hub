import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ElsaPlusDisclaimer } from "@/components/elsa-plus";

const criteria = [
  {
    title: "It tracks a stated Elsa version.",
    body: "You can tell which Elsa is inside, and which version of it.",
  },
  {
    title: "It does not fork the engine.",
    body: "Packaging, defaults, configuration and integrations may differ. Engine behaviour and APIs must not. A workflow that runs on Elsa runs on any distribution of it.",
  },
  {
    title: "It publishes a support policy.",
    body: "What gets patched, how quickly, for how long a version line is supported, and what happens when something falls outside that.",
  },
  {
    title: "It names its provider.",
    body: "Who is responsible for it, and how to reach them.",
  },
  {
    title: "It states its licence plainly,",
    body: "including anything that differs from Elsa's own MIT licence.",
  },
];

const notList = [
  {
    title: "Not a different Elsa.",
    body: "Your workflow definitions move between distributions, and to and from a self-assembled deployment.",
  },
  {
    title: "Not required.",
    body: "Building your own from the open source packages is fully supported and will remain so.",
  },
  {
    title: "Not an endorsement.",
    body: "Elsa Workflows is vendor-neutral. Listing a distribution under Elsa+ means it meets the criteria above — not that the project recommends it over any other, or over doing it yourself.",
  },
];

export default function Distributions() {
  return (
    <Layout>
      <Seo
        path="/elsa-plus/distributions"
        title="What is an Elsa distribution?"
        description="An Elsa distribution is a packaged, versioned assembly of Elsa Workflows published by a named provider under a stated support policy — same engine, someone else's assembly and maintenance."
      />

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
                <BreadcrumbPage>Distributions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="container max-w-3xl space-y-5">
          <h1 className="text-4xl md:text-5xl font-bold">What is an Elsa distribution?</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Elsa Workflows is an engine and a set of libraries. Getting it into production means
            assembling things around it: choosing a host, a persistence provider, a message bus, a
            scheduler; building container images; hardening them; tracking versions; patching CVEs
            as they appear.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Most teams do that themselves, and always will be able to. Some would rather someone
            else did it.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            An Elsa distribution is a packaged, versioned assembly of Elsa Workflows, published by
            a named provider under a stated support policy. Same engine, someone else's assembly
            and maintenance — much as a Linux distribution relates to the kernel.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A distribution is not a fork. It changes how Elsa is packaged, configured and
            supported. It does not change what Elsa does.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container max-w-3xl space-y-6">
          <h2 className="text-3xl font-bold">What makes something a distribution</h2>
          <p className="text-muted-foreground">
            Distributions listed under Elsa+ meet all of the following:
          </p>
          <ol className="space-y-3">
            {criteria.map((c, i) => (
              <li key={c.title} className="rounded-xl border bg-card p-5 flex gap-4">
                <span className="text-sm font-semibold text-primary tabular-nums pt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold">{c.title}</span>{" "}
                  <span className="text-muted-foreground">{c.body}</span>
                </p>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground leading-relaxed">
            The second criterion is the one that matters most to the project. Distributions that
            diverge on engine behaviour would fragment the thing they distribute, and your
            workflows would stop being portable. That is the line.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl space-y-6">
          <h2 className="text-3xl font-bold">What a distribution is not</h2>
          <ul className="space-y-3">
            {notList.map((n) => (
              <li key={n.title} className="rounded-xl border bg-card p-5 text-sm leading-relaxed">
                <span className="font-semibold">{n.title}</span>{" "}
                <span className="text-muted-foreground">{n.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container max-w-3xl space-y-6">
          <h2 className="text-3xl font-bold">Available distributions</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-4 py-3">Distribution</th>
                  <th className="text-left font-medium px-4 py-3">Provider</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      to="/elsa-plus/valence-runtime"
                      className="text-primary hover:underline font-medium"
                    >
                      Valence Runtime
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">Valence Works</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">Early Preview</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Building a distribution of Elsa? The criteria above are the whole bar. Get in touch and
            it can be listed here.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-4xl">
          <ElsaPlusDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
