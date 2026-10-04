import { FUNDAMENTALS_CORE_GUMROAD_URL } from "./trainingInterest";
import { SITE_URL } from "./site";

export const TRAINING_PATH = "/elsa-plus/training";
export const TRAINING_TITLE = "Elsa Workflows Training | Hands-on Elsa 3 Course for .NET";
export const TRAINING_DESCRIPTION =
  "Learn Elsa Workflows 3 hands-on: self-paced course and lab kit for hosting, Studio, HTTP workflows and approvals. Solo Bundle, team packs, workshops.";
export const TRAINING_H1 = "Elsa Workflows Training for .NET Developers and Teams";

export const TRAINING_INTRO_BEFORE = "The ";
export const TRAINING_INTRO_EMPHASIS = "Solo Bundle";
export const TRAINING_INTRO_AFTER =
  " gives you every self-paced module and lab on Elsa 3.8.4 for one low price. Team packs cover 5 or 10 seats. Prefer a facilitator for your whole team? Request a private workshop.";
export const TRAINING_INTRO = `${TRAINING_INTRO_BEFORE}${TRAINING_INTRO_EMPHASIS}${TRAINING_INTRO_AFTER}`;

export const TRAINING_OG_IMAGE_PATH = "/og-training.png";
export const TRAINING_OG_IMAGE_URL = `${SITE_URL}${TRAINING_OG_IMAGE_PATH}`;
export const TRAINING_CANONICAL_URL = `${SITE_URL}${TRAINING_PATH}`;

export const TRAINING_LAUNCH_PRICE_EUR = 29;
export const TRAINING_POST_LAUNCH_PRICE_EUR = 39;
/** Last calendar day of the launch Solo Bundle price. Regular price starts the next day (1 Nov 2026). */
export const TRAINING_PRICE_VALID_UNTIL = "2026-10-31";
export const TRAINING_REGULAR_PRICE_VALID_FROM = nextUtcDay(TRAINING_PRICE_VALID_UNTIL);
export const TRAINING_OFFER_PRICE = String(TRAINING_LAUNCH_PRICE_EUR);
export const TRAINING_OFFER_CURRENCY = "EUR";
export const TRAINING_LAUNCH_UNTIL_LABEL = formatDayMonthUtc(TRAINING_PRICE_VALID_UNTIL);
export const TRAINING_PROVIDER_SAME_AS = "https://github.com/elsa-workflows";

function nextUtcDay(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return date.toISOString().slice(0, 10);
}

function formatDayMonthUtc(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = Number(match[3]);
  const month = Number(match[2]);
  return `${day} ${months[month - 1]}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rh(attrs: string): string {
  return `data-rh="true"${attrs ? ` ${attrs}` : ""}`;
}

export function buildTrainingHead(): string {
  const jsonLd = trainingCourseJsonLd();
  return [
    `<title ${rh("")}>${esc(TRAINING_TITLE)}</title>`,
    `<meta ${rh('name="description"')} content="${esc(TRAINING_DESCRIPTION)}" />`,
    `<link ${rh('rel="canonical"')} href="${esc(TRAINING_CANONICAL_URL)}" />`,
    `<meta ${rh('property="og:type"')} content="website" />`,
    `<meta ${rh('property="og:site_name"')} content="Elsa Workflows" />`,
    `<meta ${rh('property="og:title"')} content="${esc(TRAINING_TITLE)}" />`,
    `<meta ${rh('property="og:description"')} content="${esc(TRAINING_DESCRIPTION)}" />`,
    `<meta ${rh('property="og:url"')} content="${esc(TRAINING_CANONICAL_URL)}" />`,
    `<meta ${rh('property="og:image"')} content="${esc(TRAINING_OG_IMAGE_URL)}" />`,
    `<meta ${rh('name="twitter:card"')} content="summary_large_image" />`,
    `<meta ${rh('name="twitter:title"')} content="${esc(TRAINING_TITLE)}" />`,
    `<meta ${rh('name="twitter:description"')} content="${esc(TRAINING_DESCRIPTION)}" />`,
    `<meta ${rh('name="twitter:image"')} content="${esc(TRAINING_OG_IMAGE_URL)}" />`,
    `<script ${rh('type="application/ld+json"')}>${JSON.stringify(jsonLd)}</script>`,
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
    inLanguage: "en",
    provider: {
      "@type": "Organization",
      name: "Elsa Workflows",
      url: SITE_URL,
      sameAs: TRAINING_PROVIDER_SAME_AS,
    },
    offers: [
      {
        "@type": "Offer",
        category: "Paid",
        name: "Launch price",
        price: TRAINING_OFFER_PRICE,
        priceCurrency: TRAINING_OFFER_CURRENCY,
        priceValidUntil: TRAINING_PRICE_VALID_UNTIL,
        url: FUNDAMENTALS_CORE_GUMROAD_URL,
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        category: "Paid",
        name: "Regular price",
        price: String(TRAINING_POST_LAUNCH_PRICE_EUR),
        priceCurrency: TRAINING_OFFER_CURRENCY,
        validFrom: TRAINING_REGULAR_PRICE_VALID_FROM,
        url: FUNDAMENTALS_CORE_GUMROAD_URL,
        availability: "https://schema.org/InStock",
      },
    ],
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
    },
  };
}
