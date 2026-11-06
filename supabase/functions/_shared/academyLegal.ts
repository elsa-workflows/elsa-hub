/**
 * Checkout-relevant Elsa Academy legal strings for Edge Functions.
 * Copied from src/lib/academyLegal.ts. Edge functions cannot import src/lib.
 * academyLegal_test.ts reads the src file as text and asserts these stay identical.
 *
 * Seller details (including the registered address) belong on the
 * /legal/academy-terms page only. Do not put the address in the footer.
 */

export const ACADEMY_TERMS_VERSION = "2026-10-31";
export const ACADEMY_TERMS_PATH = "/legal/academy-terms";
export const ACADEMY_TERMS_URL = `https://www.elsaworkflows.io${ACADEMY_TERMS_PATH}`;
export const ACADEMY_REFUNDS_URL = `${ACADEMY_TERMS_URL}#refunds`;

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

/** Seller line for invoice/receipt footers. No registered address. */
export const ACADEMY_SELLER_FOOTER_LINE =
  "Skywalker Digital BV, trading as Valence Works, KvK 88244520, VAT NL864551484B01";

export const ACADEMY_INVOICE_FOOTER =
  `${ACADEMY_CONFIRMATION_SENTENCE} ${ACADEMY_SELLER_FOOTER_LINE}`;

/**
 * Invoice footer. The waiver sentence is only used when Stripe actually
 * collected ToS consent. Otherwise the footer is the seller line alone.
 */
export function academyInvoiceFooter(tosConsentEnabled: boolean): string {
  return tosConsentEnabled ? ACADEMY_INVOICE_FOOTER : ACADEMY_SELLER_FOOTER_LINE;
}

/**
 * Card statement descriptor suffix. Stripe concatenates
 * `{prefix}* {suffix}` and the combined descriptor is max 22 characters.
 * This suffix is 12 characters (also under the 22-character suffix cap).
 */
export const ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX = "ELSA ACADEMY";

export const ACADEMY_TOS_CONSENT_ENV = "ACADEMY_TOS_CONSENT_ENABLED";

const SHARED_EXPORT_NAMES = [
  "ACADEMY_TERMS_VERSION",
  "ACADEMY_TERMS_PATH",
  "ACADEMY_TERMS_URL",
  "ACADEMY_REFUNDS_URL",
  "ACADEMY_STRIPE_TOS_ACCEPTANCE",
  "ACADEMY_STRIPE_SUBMIT_MESSAGE",
  "ACADEMY_CONFIRMATION_SENTENCE",
] as const;

export const ACADEMY_LEGAL_SHARED_EXPORTS = SHARED_EXPORT_NAMES;

export function isAcademyTosConsentEnabled(
  env: { get: (key: string) => string | undefined } = Deno.env,
): boolean {
  return env.get(ACADEMY_TOS_CONSENT_ENV) === "true";
}
