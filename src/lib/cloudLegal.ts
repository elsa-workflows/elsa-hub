/**
 * Elsa Cloud Early Access Terms, ported to the Hub.
 *
 * Source: valence-works/elsa-cloud src/pages/Terms.tsx at commit 1dc783f
 * ("Tighten Elsa Cloud product copy", 14 September 2026), as published on
 * elsacloud.app/terms ("Effective 14 September 2026"). The wording is kept
 * verbatim except for factual product, price-unit, trial and URL changes,
 * each marked with a CHANGED comment. Do not edit this text without Sipke's
 * approval; it is customer-facing legal copy.
 */

export const CLOUD_TERMS_PATH = "/legal/cloud-terms";
export const CLOUD_TERMS_TITLE = "Elsa Cloud Early Access Terms";
export const CLOUD_TERMS_DESCRIPTION =
  "Early Access Terms for business customers using the Elsa Cloud Preview, operated by Valence Works.";
export const CLOUD_TERMS_EFFECTIVE = "14 September 2026";
export const CLOUD_TERMS_CONTACT_EMAIL = "hello@valence.works";
/** CHANGED: the Hub has no privacy page yet; link the published Elsa Cloud notice. */
export const CLOUD_PRIVACY_NOTICE_URL = "https://elsacloud.app/privacy";

export interface CloudTermsSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  points: string[];
}

export const CLOUD_TERMS_HERO = {
  eyebrow: "Public terms · Early access",
  lede: "The commercial and operating terms for businesses using Elsa Cloud Preview.",
  note: `Effective ${CLOUD_TERMS_EFFECTIVE}. Hosted is available as a €99 monthly Preview; BYO Azure remains waitlist-only until offered.`,
  factsLabel: "Key Preview terms",
  facts: [
    // CHANGED: price unit (per dedicated engine).
    { label: "Hosted", value: "€99 / month per dedicated engine" },
    // CHANGED: BYO shown as coming soon / waitlist.
    { label: "BYO", value: "€79 / month · coming soon, waitlist only" },
    // CHANGED: trial length removed (was "14 days Hosted").
    { label: "Trial", value: "Free trial, Hosted" },
    { label: "Support", value: "Business hours · no SLO" },
  ],
} as const;

export const CLOUD_TERMS_INTRO = {
  eyebrow: "Read this first",
  title: "Commercial and operating terms",
  body: "These terms apply to the business customer using Elsa Cloud Preview. They sit alongside the plan, price and checkout details shown when that customer subscribes.",
  caveat:
    "There is no contractual SLO, availability promise or service-credit programme in the Preview. Hosted customer workloads run in West Europe in the EU/EEA.",
} as const;

export const CLOUD_TERMS_CONTACT = {
  eyebrow: "Questions",
  title: "Questions about these terms",
  body: "For questions about these terms or the current Preview offering, contact Skywalker Digital B.V. trading as Valence Works.",
} as const;

export const CLOUD_TERMS_SECTIONS: CloudTermsSection[] = [
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
      // CHANGED: "per dedicated engine" added; "A Hosted Preview trial, when offered, lasts 14 days." -> no trial length.
      "Hosted is the Valence Works-operated environment and is €99 per month per dedicated engine when subscribed. A free Hosted Preview trial may be offered.",
      "BYO is the software path for your own Azure foundation and is €79 per month when offered. Your Azure subscription and other third-party charges remain your responsibility.",
      "The plan, price, payment timing and any checkout details shown when you subscribe form the commercial details for that subscription. We do not promise that every Preview path will be available to every business.",
    ],
  },
  {
    id: "payment",
    number: "03",
    title: "Payment, cancellation and refunds",
    summary: "How trials, renewals, failed payments, cancellation and refunds work.",
    points: [
      // CHANGED: "A Hosted trial lasts 14 days. Unless you cancel..." -> no trial length; "per dedicated engine" added.
      "Where a free Hosted trial is offered, unless you cancel before it ends, the subscription starts at €99 per month per dedicated engine using the payment method supplied at checkout. Hosted subscriptions then renew monthly until cancelled. Taxes may be added where applicable.",
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
