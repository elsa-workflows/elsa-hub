import { FUNDAMENTALS_CORE_GUMROAD_URL } from "./trainingInterest";
import { SITE_URL } from "./site";

export const TRAINING_PATH = "/elsa-plus/training";
export const TRAINING_TITLE = "Elsa Workflows Fundamentals for Teams: Elsa+";
export const TRAINING_DESCRIPTION =
  "Self-paced Elsa Workflows training for .NET teams adopting Elsa 3. The Solo Bundle covers Fundamentals Core and Complete, Advanced Patterns with Approval Lite, and the Elsa 3.8.4 lab kit. Team packs and private workshops available.";
export const TRAINING_H1 = "Elsa Workflows Fundamentals for Teams";
export const TRAINING_INTRO =
  "The Solo Bundle gives you every self-paced module and lab on Elsa 3.8.4 for one low price. Team packs cover 5 or 10 seats. Prefer a facilitator for your whole team? Request a private workshop.";
export const TRAINING_OG_IMAGE_PATH = "/og-training.png";
export const TRAINING_OG_IMAGE_URL = `${SITE_URL}${TRAINING_OG_IMAGE_PATH}`;
export const TRAINING_CANONICAL_URL = `${SITE_URL}${TRAINING_PATH}`;
export const TRAINING_OFFER_PRICE = "29";
export const TRAINING_OFFER_CURRENCY = "EUR";
export const TRAINING_PRICE_VALID_UNTIL = "2026-10-31";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildTrainingHead(): string {
  const jsonLd = trainingCourseJsonLd();
  return [
    `<title>${esc(TRAINING_TITLE)}</title>`,
    `<meta name="description" content="${esc(TRAINING_DESCRIPTION)}" />`,
    `<link rel="canonical" href="${esc(TRAINING_CANONICAL_URL)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Elsa Workflows" />`,
    `<meta property="og:title" content="${esc(TRAINING_TITLE)}" />`,
    `<meta property="og:description" content="${esc(TRAINING_DESCRIPTION)}" />`,
    `<meta property="og:url" content="${esc(TRAINING_CANONICAL_URL)}" />`,
    `<meta property="og:image" content="${esc(TRAINING_OG_IMAGE_URL)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(TRAINING_TITLE)}" />`,
    `<meta name="twitter:description" content="${esc(TRAINING_DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${esc(TRAINING_OG_IMAGE_URL)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join("\n    ");
}

export function buildTrainingBody(): string {
  return `<section data-prerendered="true">
  <h1>${esc(TRAINING_H1)}</h1>
  <p>${esc(TRAINING_INTRO)}</p>
</section>`;
}

export function trainingCourseJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: TRAINING_H1,
    description: TRAINING_DESCRIPTION,
    url: TRAINING_CANONICAL_URL,
    image: TRAINING_OG_IMAGE_URL,
    provider: {
      "@type": "Organization",
      name: "Elsa Workflows",
      url: SITE_URL,
      sameAs: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      category: "Paid",
      price: TRAINING_OFFER_PRICE,
      priceCurrency: TRAINING_OFFER_CURRENCY,
      priceValidUntil: TRAINING_PRICE_VALID_UNTIL,
      url: FUNDAMENTALS_CORE_GUMROAD_URL,
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
    },
  };
}
