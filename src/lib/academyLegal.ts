/**
 * Elsa Academy checkout legal text: one source for the /legal/academy-terms
 * page, the Hub pre-checkout waiver checkbox, the Stripe Checkout custom text
 * and the invoice/receipt footer.
 *
 * Bump ACADEMY_TERMS_VERSION whenever any string here changes, and store the
 * version with each purchase (session metadata) so we can show which text a
 * buyer accepted.
 *
 * Seller details (including the registered address) belong on the
 * /legal/academy-terms page only. Do not reuse ACADEMY_SELLER.address in the
 * footer, other pages, the checkout or emails.
 */

import {
  TRAINING_LAUNCH_PRICE_EUR,
  TRAINING_LAUNCH_UNTIL_LABEL,
  TRAINING_POST_LAUNCH_PRICE_EUR,
} from "./trainingSeo";

export const ACADEMY_TERMS_VERSION = "2026-10-16";
export const ACADEMY_TERMS_PATH = "/legal/academy-terms";
export const ACADEMY_TERMS_URL = `https://www.elsaworkflows.io${ACADEMY_TERMS_PATH}`;
export const ACADEMY_REFUNDS_URL = `${ACADEMY_TERMS_URL}#refunds`;
export const ACADEMY_TERMS_TITLE = "Elsa Academy terms of sale and refund policy";
export const ACADEMY_TERMS_DESCRIPTION =
  "Terms of sale, refund policy and EU withdrawal-right information for Elsa Academy courses bought on Elsa Hub.";

export const ACADEMY_TERMS_INDEX_PATH = "/legal/terms";

export const ACADEMY_SELLER = {
  tradeName: "Valence Works",
  legalName: "Skywalker Digital BV",
  kvk: "88244520",
  vat: "NL864551484B01",
  address: "Meervelderweg 72, 3888 NK Uddel, the Netherlands",
  email: "billing@valence.works",
} as const;

/**
 * Academy prices in euros. Solo prices include VAT (consumer price);
 * Team prices exclude VAT (business purchase). Solo amounts come from
 * trainingSeo so the Training page and the terms never drift apart.
 */
export const ACADEMY_SOLO_LAUNCH_PRICE_EUR = TRAINING_LAUNCH_PRICE_EUR;
export const ACADEMY_SOLO_REGULAR_PRICE_EUR = TRAINING_POST_LAUNCH_PRICE_EUR;
export const ACADEMY_SOLO_LAUNCH_UNTIL_LABEL = TRAINING_LAUNCH_UNTIL_LABEL;
export const ACADEMY_TEAM_5_PRICE_EUR = 349;
export const ACADEMY_TEAM_10_PRICE_EUR = 599;

/** Lessons a buyer may open and still qualify for a no-questions refund. */
export const ACADEMY_REFUND_LESSON_THRESHOLD_PERCENT = 20;
export const ACADEMY_REFUND_WINDOW_DAYS = 14;

/**
 * Hub checkout page, shown before the redirect to Stripe. Must render as an
 * UNTICKED checkbox; the Buy button stays disabled until the buyer ticks it.
 */
export const ACADEMY_WAIVER_CHECKBOX_LABEL =
  "I want access to Elsa Academy straight away. I agree that delivery starts as soon as my payment is confirmed, and I understand that I lose my 14-day right of withdrawal once access starts.";

/** Hub checkout page, small print under the checkbox and above the Buy button. */
export const ACADEMY_CHECKOUT_NOTICE =
  "By continuing you agree to the Elsa Academy terms of sale and refund policy. Solo Bundle prices include VAT. Team 5 and Team 10 prices exclude VAT, which is calculated on the next page from your billing details.";

/**
 * Stripe Checkout custom_text.terms_of_service_acceptance.message (max 1200
 * characters, Markdown links allowed). Used with
 * consent_collection.terms_of_service = "required".
 */
export const ACADEMY_STRIPE_TOS_ACCEPTANCE = `I agree to the [Elsa Academy terms of sale](${ACADEMY_TERMS_URL}). I asked for immediate access and understand that I lose my 14-day right of withdrawal once access starts.`;

/** Stripe Checkout custom_text.submit.message (max 1200 characters). */
export const ACADEMY_STRIPE_SUBMIT_MESSAGE = `Your Academy access starts right after payment. Refunds: ${ACADEMY_REFUNDS_URL}`;

/**
 * Durable-medium confirmation (Directive 2011/83/EU art. 8(7), BW 6:230t).
 * Goes in invoice_creation.invoice_data.footer so it lands on the Stripe
 * invoice PDF and receipt email, and in any Hub purchase email.
 */
export const ACADEMY_CONFIRMATION_SENTENCE = `You asked for immediate access to Elsa Academy and confirmed that you lose your 14-day right of withdrawal once access starts. Access started when your payment was confirmed. Our goodwill refund policy still applies: ${ACADEMY_REFUNDS_URL}. Terms version ${ACADEMY_TERMS_VERSION}.`;

export interface AcademyTermsSection {
  id: string;
  title: string;
  /** Markdown. */
  body: string;
}

const s = ACADEMY_SELLER;
const pct = ACADEMY_REFUND_LESSON_THRESHOLD_PERCENT;
const days = ACADEMY_REFUND_WINDOW_DAYS;

export const ACADEMY_TERMS_SECTIONS: AcademyTermsSection[] = [
  {
    id: "seller",
    title: "1. Who you buy from",
    body: `Elsa Academy is sold by ${s.legalName}, trading as ${s.tradeName}, ${s.address}. Chamber of Commerce (KvK): ${s.kvk}. VAT: ${s.vat}. Contact: [${s.email}](mailto:${s.email}).

These terms apply to every Elsa Academy purchase on www.elsaworkflows.io. They do not cover other Elsa+ products, which have their own terms.`,
  },
  {
    id: "product",
    title: "2. What you get",
    body: `Elsa Academy courses are self-paced, pre-recorded and written lessons with downloadable kit files. They are not interactive and include no personal support, unless your product says otherwise.

- **Solo Bundle:** one personal licence for one named person.
- **Team 5 and Team 10:** five or ten seats that the buying organisation assigns to its own people in Elsa Hub.
- **Team 10** also includes one live Q&A session of up to 60 minutes for your team. We agree a date with you by email. The session must take place within 6 months of purchase; after that it lapses without refund.

Courses are taught against the Elsa versions stated on the course page. Content may be updated, reordered or replaced over time; we will not remove the core material you paid for while the product is offered.`,
  },
  {
    id: "prices",
    title: "3. Prices and payment",
    body: `All prices are one-time prices in euros.

- **Solo Bundle:** €${ACADEMY_SOLO_LAUNCH_PRICE_EUR} including VAT until ${ACADEMY_SOLO_LAUNCH_UNTIL_LABEL} 2026, then €${ACADEMY_SOLO_REGULAR_PRICE_EUR} including VAT. The price you see is the price you pay.
- **Team 5:** €${ACADEMY_TEAM_5_PRICE_EUR} excluding VAT. **Team 10:** €${ACADEMY_TEAM_10_PRICE_EUR} excluding VAT. Team packs are business purchases; VAT, where due, is added at checkout from your billing details and shown before you pay.

Business buyers can enter a VAT number; reverse charge applies where the law allows.

Payment is handled by Stripe. Your order is accepted when Stripe confirms your payment. You receive an invoice and receipt by email.

Introductory prices are valid only for the period shown on the product page. The price that applies to you is the one shown at checkout when you pay.`,
  },
  {
    id: "access",
    title: "4. Access and licence",
    body: `Access starts straight after payment, behind your Elsa Hub login.

You get a personal, non-transferable, non-exclusive licence to use the course content and kit files for your own learning and for your own or your employer's internal projects, for as long as we offer Elsa Academy. If we ever stop offering it, we will give at least 6 months' notice by email, and the kit files you downloaded remain yours to use under this licence.

You may not share your login, resell, republish or redistribute the course content or kits, or use them to run training for third parties. Code samples inside the kits may be used in your own software.

**Team seats:** each seat is for one named person. The organisation may move a seat to another person when someone leaves the team, but seats may not be shared or rotated to give more people access at the same time.`,
  },
  {
    id: "withdrawal",
    title: "5. Your 14-day withdrawal right (EU consumers)",
    body: `If you buy as a consumer in the EU, you normally have 14 days to withdraw from an online purchase. For digital content that is not on a physical medium, this right ends once delivery starts, if you asked for immediate delivery and acknowledged that you lose the withdrawal right (Directive 2011/83/EU, article 16(m), and Dutch Civil Code article 6:230p).

Elsa Academy is delivered immediately. At checkout we therefore ask you to tick a box to request immediate access and to confirm that you lose your withdrawal right once access starts. We confirm this in your receipt email. If you do not tick the box, you cannot complete the purchase.

Business buyers do not have a statutory withdrawal right. Our goodwill refund policy below still applies to everyone.`,
  },
  {
    id: "refunds",
    title: "6. Refund policy",
    body: `Even though the withdrawal right ends at access, we refund you in full if you ask within ${days} days of purchase and:

- you have opened no more than ${pct}% of the lessons in the product, **and**
- nobody on your licence or seats has downloaded a kit file.

We also refund in full, at any time:

- a duplicate purchase of the same product for the same person or organisation, and
- a purchase you could not use because of a technical failure on our side that we could not fix within 14 days of you reporting it.

To ask for a refund, email [${s.email}](mailto:${s.email}) from the address you bought with, or include your invoice number. We refund to the original payment method, normally within 14 days of approving it. When a refund is made, access to the refunded product ends.

This policy does not limit any right you have under mandatory consumer law, including your rights if the content is faulty or not as described.`,
  },
  {
    id: "faults",
    title: "7. If something is wrong",
    body: `If content is missing, broken or not as described, tell us at [${s.email}](mailto:${s.email}). We will fix or replace it within a reasonable time. If we cannot, you can ask for a price reduction or a refund.`,
  },
  {
    id: "liability",
    title: "8. Liability",
    body: `Elsa Academy is educational material. You are responsible for how you use it in your own systems. To the extent the law allows, our total liability for a purchase is limited to the amount you paid for it, and we are not liable for indirect or consequential loss. Nothing in these terms limits liability that cannot be limited by law, or the mandatory rights of consumers.`,
  },
  {
    id: "law",
    title: "9. Law, disputes and changes",
    body: `Dutch law applies. Disputes go to the competent court in the Netherlands. If you are a consumer living elsewhere in the EU, you keep the protection of the mandatory law of your country and may also bring a claim in your own courts.

We may update these terms. The version you accepted at checkout applies to your purchase. This version: ${ACADEMY_TERMS_VERSION}.`,
  },
];
