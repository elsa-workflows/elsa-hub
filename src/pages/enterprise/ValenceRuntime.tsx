import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NeutralityDisclaimer } from "@/components/enterprise";
import { ArrowRight, Check, ExternalLink, Minus } from "lucide-react";

const tiers = ["Community", "Runtime", "Runtime Priority", "Maintainer Access"] as const;

const rows: { label: string; values: (string | boolean)[] }[] = [
  { label: "Price / year", values: ["Free", "€1,500", "€4,500", "€25,000"] },
  { label: "Availability", values: ["Open", "Open", "Open", "3 slots"] },
  { label: "Registry", values: ["Public", "Private", "Private", "Private"] },
  { label: "Hardened, signed, SBOM", values: ["Yes — same build", true, true, true] },
  { label: "Security patch commitment", values: [false, true, true, true] },
  { label: "Immutable version tags", values: [false, true, true, true] },
  {
    label: "Bug reports triaged",
    values: ["Public queue", "5 business days", "2 business days", "1 business day"],
  },
  { label: "Queue priority", values: ["Lowest", "Standard", "High", "Top"] },
  { label: "Backports to your pinned minor", values: [false, false, true, true] },
  { label: "Advance security notice", values: [false, false, true, true] },
  { label: "Direct channel to the maintainer", values: [false, false, false, true] },
  { label: "Quarterly check-in call", values: [false, false, false, true] },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-4 w-4 text-primary mx-auto" aria-label="Yes" />;
  if (value === false)
    return <Minus className="h-4 w-4 text-muted-foreground/60 mx-auto" aria-label="Not included" />;
  return <span>{value}</span>;
}

const outcomes: { label: string; description: string }[] = [
  {
    label: "Accepted",
    description: "Confirmed as a defect, placed on the roadmap against a target release",
  },
  {
    label: "Needs information",
    description: "Can't reproduce it as submitted — here's what's needed",
  },
  {
    label: "Won't fix",
    description: "Not a defect, or out of scope — with the reason stated",
  },
  {
    label: "Already fixed",
    description: "Resolved in a release, which is named",
  },
];

const tierDetails: { name: string; badge?: string; body: string; extra?: string }[] = [
  {
    name: "Community",
    badge: "Free",
    body: "The same build the paid tiers get — same layers, same digest, nothing stripped out or deliberately degraded. Public on ghcr.io, pullable with no account and no login. What it does not include: any patch commitment, any triage commitment, backports, or immutable version tags. It publishes only moving tags (latest and the Elsa version), so a Community deployment cannot be pinned to an exact build. That is the line between evaluating freely and depending on it commercially.",
  },
  {
    name: "Runtime",
    badge: "€1,500 / year",
    body: "Hardened images, committed security-patch cadence, immutable tags, private registry — plus bug reports triaged within five business days and weighted above the community queue.",
  },
  {
    name: "Runtime Priority",
    badge: "€4,500 / year",
    body: "Everything above, with two-business-day triage, higher queue priority, advance notice of security fixes, and backports to the minor version you run. For anyone pinned to a specific version in production.",
    extra:
      "Backports cover the current minor and the one before it, for 12 months from the release of its successor. Security fixes and defects causing data loss, incorrect execution or unavailability are backported; cosmetic fixes wait for the next minor, so your pinned line isn't churned with unnecessary changes.",
  },
  {
    name: "Maintainer Access",
    badge: "€25,000 / year — 3 slots",
    body: "Everything above, with one-business-day triage, top queue priority, a direct channel to Sipke Schoorstra, and a quarterly check-in call. Deliberately capped at three subscribers so the attention stays real — when all three are taken, you can join the waitlist.",
  },
];

const notIncluded = [
  "Custom feature work",
  "Bespoke integrations",
  "Building your workflows",
  "Debugging third-party systems and non-Elsa infrastructure",
  "Self-modified builds",
  "Performing migrations",
];

const faq = [
  {
    q: "What is an Elsa distribution?",
    a: (
      <>
        A packaged, versioned assembly of the open-source engine, built and maintained by a vendor. It tracks Elsa Workflows without forking it.{" "}
        <Link to="/elsa-plus/distributions" className="text-primary hover:underline">
          Read the full explanation
        </Link>
        .
      </>
    ),
  },
  {
    q: "It's open source — why would I pay?",
    a: "You're not paying for the software; it stays MIT and free forever. You're paying for the production build — hardened, patched on a committed cadence — and a committed triage window from the person who wrote it.",
  },
  {
    q: "What if you get hit by a bus?",
    a: "Elsa core is MIT and independently forkable. The images are standard OCI containers with no proprietary runtime, no licence keys and no kill switches, so you can keep running what you're running.",
  },
  {
    q: "Can I buy support without the images?",
    a: "Not as a subscription — support is scoped to builds whose contents are known. Expert Services covers self-built deployments instead.",
  },
  {
    q: "Maintainer Access is full — now what?",
    a: "You can join the waitlist and start on Runtime Priority, which already includes two-business-day triage and backports. Get in touch and you'll be told where the queue stands.",
  },
];


export default function ValenceRuntime() {
  return (
    <Layout>
      <Seo
        path="/elsa-plus/valence-runtime"
        title="Valence Runtime — an Elsa distribution from Valence Works"
        description="Valence Runtime is an Elsa distribution from Valence Works: production-ready server, Studio and combined container images with a committed security-patch cadence and committed bug triage windows on paid tiers."
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
                <BreadcrumbPage>Valence Runtime</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <Badge variant="secondary">Provided by Valence Works</Badge>
              <Badge variant="outline">Early Preview</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Valence Runtime</h1>
            <p className="text-xl text-muted-foreground">
              An Elsa distribution from Valence Works — production-ready container images for
              server, Studio and combined deployments, built, hardened and patched by the
              maintainer of Elsa. Subscriptions add a committed security-patch cadence and a bug
              queue he actually works.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              <Link to="/elsa-plus/distributions" className="text-primary hover:underline">
                What is an Elsa distribution?
              </Link>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <Button asChild>
                <Link to="/elsa-plus/expert-services/valence-works">
                  Contact us
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://github.com/valence-works/runtime"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Documentation
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/elsa-plus/valence-runtime/images">Browse images</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">What it is</h2>
          <p className="text-muted-foreground leading-relaxed">
            Elsa Workflows itself is open source under the MIT License and always will be. The
            Valence Runtime container images and their packaging are licensed commercially and
            require a subscription. Nothing has moved behind a paywall: Valence Runtime is the
            assembled, production-ready distribution — pre-built container images, a committed
            security-patch cadence, and, on paid tiers, direct access to the person who wrote Elsa.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Not yet a supported distribution — production hardening, container scanning, and stable
            release guarantees are on the roadmap. Elsa 3.8 remains in preview.
          </p>
        </div>
      </section>


      {/* Try it — free images */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Try it</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Community images are public on GitHub Container Registry. No account, no login —
            just pull:
          </p>
          <pre className="rounded-xl border bg-muted/40 p-4 overflow-x-auto text-sm font-mono">
{`docker pull ghcr.io/valence-works/runtime-ce-combined:latest

docker run -it -p 13000:8080 \\
  -e ASPNETCORE_ENVIRONMENT=Development \\
  ghcr.io/valence-works/runtime-ce-combined:latest`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold">Free — public, no account</h3>
              <ul className="text-muted-foreground font-mono text-xs space-y-1">
                <li>ghcr.io/valence-works/runtime-ce-server</li>
                <li>ghcr.io/valence-works/runtime-ce-studio</li>
                <li>ghcr.io/valence-works/runtime-ce-combined</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold">Paid — private, requires a subscription</h3>
              <ul className="text-muted-foreground font-mono text-xs space-y-1">
                <li>ghcr.io/valence-works/runtime-server</li>
                <li>ghcr.io/valence-works/runtime-studio</li>
                <li>ghcr.io/valence-works/runtime-combined</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The older Docker Hub names (<span className="font-mono">valenceworks/elsa-pro-*</span>)
            still work for anyone who already pulled them, but they are no longer updated. New
            builds are published to ghcr.io only.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href="https://github.com/valence-works/runtime"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Documentation &amp; issue tracking
            </a>
            <a
              href="https://github.com/valence-works/runtime/wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Setup guide
            </a>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container max-w-5xl space-y-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Tiers</h2>
            <p className="text-muted-foreground">
              The paid tiers are not different software. Community runs the same build; what a
              subscription adds is commitments about it — patches, triage windows, backports and
              immutable tags.
            </p>
          </div>


          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left font-medium px-4 py-3 w-56">&nbsp;</th>
                  {tiers.map((t) => (
                    <th key={t} className="px-4 py-3 font-semibold text-center">
                      <div>{t}</div>
                      {t === "Community" && (
                        <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                          Early Preview
                        </Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t">
                    <th scope="row" className="text-left font-medium px-4 py-3 text-muted-foreground">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        <Cell value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            All prices are per year, in EUR, excluding VAT. Valence Works is based in the
            Netherlands: EU reverse charge applies for business customers outside NL, Dutch VAT
            within.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Subscriptions are not open yet. Valence Runtime is in Early Preview — prices are
            published so you can plan and budget. Get in touch to discuss a tier or request
            preview access.
          </p>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm leading-relaxed">
              Prices may change. If they do, existing subscribers keep their rate through at least
              their following renewal, and will be told before any change takes effect.
            </p>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Not sure which tier? Most teams running Elsa in production want Runtime. Move up to
            Runtime Priority if you pin to a specific version and cannot take a whole new minor to
            get a fix — that is what backports solve, and it is the only reason to pay the
            difference.
          </p>
          <Button asChild variant="outline">
            <Link to="/elsa-plus/expert-services/valence-works">Contact us</Link>
          </Button>
        </div>
      </section>

      {/* What each tier is */}
      <section className="py-12 md:py-16">

        <div className="container max-w-4xl space-y-6">
          <h2 className="text-3xl font-bold">What each tier is</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tierDetails.map((tier) => (
              <div key={tier.name} className="rounded-xl border bg-card p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  {tier.badge && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {tier.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{tier.body}</p>
                {tier.extra && (
                  <p className="text-sm text-muted-foreground leading-relaxed border-t pt-2">
                    {tier.extra}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground">
            Project work — implementation, architecture review, migrations, training — isn't
            bundled into any tier. That's{" "}
            <Link to="/elsa-plus/expert-services" className="text-primary hover:underline">
              Expert Services
            </Link>
            , quoted per engagement.
          </p>
        </div>
      </section>

      {/* Triage */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Triage is committed. Fixing is not.</h2>
          <p className="text-muted-foreground leading-relaxed">
            Every bug report gets a written answer within your tier's window. No tier promises a
            fix, or a date — time to fix an arbitrary defect depends on its cause, your
            environment, and third-party components, and a promise that can't be honoured is worse
            than none.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            What is committed: every report receives one of four written outcomes.
          </p>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                {outcomes.map((o, i) => (
                  <tr key={o.label} className={i > 0 ? "border-t" : undefined}>
                    <th
                      scope="row"
                      className="text-left font-medium px-4 py-3 align-top w-48 whitespace-nowrap"
                    >
                      {o.label}
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">{o.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Your reports are weighted above community reports in the work queue. On Runtime
            Priority and above, accepted fixes are backported to the version line you actually run
            — so you get the fix without taking a whole new minor.
          </p>
        </div>
      </section>


      {/* Not included */}
      <section className="py-12 md:py-16">
        <div className="container max-w-4xl space-y-4">
          <h2 className="text-3xl font-bold">Not included</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {notIncluded.map((item) => (
              <li key={item} className="rounded-md border bg-card px-4 py-2">
                {item}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            All of the above is available through{" "}
            <Link to="/elsa-plus/expert-services" className="text-primary hover:underline">
              Expert Services
            </Link>{" "}
            instead.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">FAQ</h2>
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container max-w-4xl">
          <NeutralityDisclaimer />
        </div>
      </section>
    </Layout>
  );
}
