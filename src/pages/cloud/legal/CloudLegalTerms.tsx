import CloudLegalDocument from "./CloudLegalDocument";
import { elsaCloudLegalPath } from "@/lib/elsaCloud";

const termsSections = [
  {
    id: "scope",
    number: "01",
    title: "Scope and parties",
    summary: "Who provides Elsa Cloud and which customers these terms cover.",
    points: [
      "Elsa Cloud is an early-access service for business customers. By using the Preview, you confirm that you are acting for a business and have authority to accept these terms.",
      "The service is provided by Skywalker Digital B.V., registered with the Dutch Chamber of Commerce under KvK 88244520 and trading as Valence Works.",
      "These terms cover the Preview service and do not change the separate licence terms for Elsa Workflows open-source software.",
    ],
  },
  {
    id: "service-and-pricing",
    number: "02",
    title: "Service and pricing",
    summary: "What Hosted and BYO Azure cost, and when each option is available.",
    points: [
      <>
        {/* REVIEW: commercial term */}
        Hosted is the Valence Works-operated environment and is €99 per month when subscribed. A Hosted Preview trial, when offered, lasts 14 days.
      </>,
      <>
        {/* REVIEW: commercial term */}
        BYO is the software path for your own Azure foundation and is €79 per month when offered. Your Azure subscription and other third-party charges remain your responsibility.
      </>,
      "The plan, price, payment timing and any checkout details shown when you subscribe form the commercial details for that subscription. We do not promise that every Preview path will be available to every business.",
    ],
  },
  {
    id: "payment",
    number: "03",
    title: "Payment, cancellation and refunds",
    summary: "How trials, renewals, failed payments, cancellation and refunds work.",
    points: [
      <>
        {/* REVIEW: commercial term */}
        A Hosted trial lasts 14 days. Unless you cancel before it ends, the subscription starts at €99 per month using the payment method supplied at checkout. Hosted subscriptions then renew monthly until cancelled. Taxes may be added where applicable.
      </>,
      "If a payment fails, we allow seven days to resolve the failed payment. We may suspend the relevant service after that grace period while an amount remains unpaid.",
      "You may cancel before the next renewal. Access continues until the end of the current paid billing period. Fees already paid are not refunded or credited for a partial month, except where applicable law requires otherwise or we expressly agree otherwise.",
      "A trial or Preview subscription does not create a contractual service level, availability commitment or service credit entitlement.",
      "You are responsible for keeping billing and account information current and for using the service in compliance with applicable law.",
    ],
  },
  {
    id: "hosting-support",
    number: "04",
    title: "Hosting and support",
    summary: "Where Hosted runs and what support the Preview includes.",
    points: [
      "For Hosted, customer workloads run in Microsoft Azure West Europe in the EU/EEA during Preview. Supporting account, billing and delivery services may process other data as described in the Privacy Notice and Subprocessors page. We do not promise multi-region availability.",
      "For BYO, you choose and operate the relevant Azure foundation. The location and configuration of that environment are your responsibility.",
      "Support is provided during business hours through the support path made available to your business. Business-hours support is not a contractual response-time or uptime commitment.",
    ],
  },
  {
    id: "content-and-ip",
    number: "05",
    title: "Your content and our software",
    summary: "Who owns customer content and what permission Valence Works needs to operate Hosted.",
    points: [
      "You retain your rights in workflow definitions, data and other content that you submit to or create in your Hosted environment. You give us the limited permission needed to host, operate, secure and support that content for the Preview.",
      "You are responsible for having the rights and permissions required for content you provide, and for avoiding secrets or other data that the service is not intended to receive.",
      "Elsa Workflows is open-source software with its own licence. These terms do not grant a different licence or take away rights provided by that licence.",
    ],
  },
  {
    id: "retention-and-ending",
    number: "06",
    title: "Retention and ending the Preview",
    summary: "What happens to Hosted customer content when access ends.",
    points: [
      "After a Hosted subscription ends or an account is cancelled, we retain Hosted customer content for up to 30 days so you have a reasonable opportunity to export it. We then delete it unless a longer period is required by law or agreed for your account.",
      "You remain responsible for exporting any content you need before the retention period ends. We do not promise recovery after deletion.",
      "We may end or restrict Preview access when needed for security, unlawful use, non-payment or operation of the early-access service. We will communicate where reasonably practicable.",
    ],
  },
  {
    id: "law-and-contact",
    number: "07",
    title: "Law and contact",
    summary: "Dutch law, changes to these terms and how to contact us.",
    points: [
      "These terms are governed by Dutch law, without changing any mandatory rights or protections that apply to your business under applicable law.",
      "We may update these public Preview terms as the service changes. The terms in effect when you start or renew a subscription apply to that period, subject to any separately agreed order or contract.",
      "Contact us about these terms at hello@valence.works.",
    ],
  },
];

export default function CloudLegalTerms() {
  return (
    <CloudLegalDocument
      id="terms"
      name="Early Access Terms"
      navLabel="Terms navigation"
      meta={{
        /* CHANGED: site name and URL — Elsa Cloud service terms on Elsa Hub */
        title: "Early Access Terms — Elsa Cloud — Elsa+",
        description:
          "Early Access Terms for business customers using the Elsa Cloud Preview, operated by Valence Works.",
        path: elsaCloudLegalPath("terms"),
      }}
      hero={{
        eyebrow: "Public terms · Early access",
        title: "Early Access Terms",
        lede: "The commercial and operating terms for businesses using Elsa Cloud Preview.",
        note: (
          <>
            {/* REVIEW: commercial term */}
            Effective 14 September 2026. Hosted is available as a €99 monthly Preview; BYO Azure remains waitlist-only until offered.
          </>
        ),
        factsLabel: "Key Preview terms",
        facts: [
          {
            label: "Hosted",
            value: (
              <>
                {/* REVIEW: commercial term */}
                €99 / month
              </>
            ),
          },
          {
            label: "BYO",
            value: (
              <>
                {/* REVIEW: commercial term */}
                €79 / month when offered
              </>
            ),
          },
          {
            label: "Trial",
            value: (
              <>
                {/* REVIEW: commercial term */}
                14 days Hosted
              </>
            ),
          },
          { label: "Support", value: "Business hours · no SLO" },
        ],
      }}
      intro={{
        eyebrow: "Read this first",
        title: "Commercial and operating terms",
        body: (
          <>
            {/* CHANGED: site name — scoped as Elsa Cloud service terms on Elsa Hub */}
            These terms apply to the business customer using Elsa Cloud Preview on Elsa Hub. They sit alongside the plan, price and checkout details shown when that customer subscribes.
          </>
        ),
        caveat:
          "There is no contractual SLO, availability promise or service-credit programme in the Preview. Hosted customer workloads run in West Europe in the EU/EEA.",
      }}
      sections={termsSections}
      related={[
        /* CHANGED: URL — Hub legal paths */
        { href: elsaCloudLegalPath("privacy"), label: "Privacy notice" },
        { href: elsaCloudLegalPath("dpa"), label: "Hosted DPA" },
      ]}
      contact={{
        eyebrow: "Questions",
        title: "Questions about these terms",
        body: "For questions about these terms or the current Preview offering, email hello@valence.works.",
        related: { label: "Read the privacy notice", to: elsaCloudLegalPath("privacy") },
      }}
    />
  );
}
