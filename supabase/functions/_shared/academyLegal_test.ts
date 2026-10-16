import { assertEquals, assertFalse } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  ACADEMY_CONFIRMATION_SENTENCE,
  ACADEMY_INVOICE_FOOTER,
  ACADEMY_LEGAL_SHARED_EXPORTS,
  ACADEMY_REFUNDS_URL,
  ACADEMY_SELLER_FOOTER_LINE,
  ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX,
  ACADEMY_STRIPE_SUBMIT_MESSAGE,
  ACADEMY_STRIPE_TOS_ACCEPTANCE,
  ACADEMY_TERMS_PATH,
  ACADEMY_TERMS_URL,
  ACADEMY_TERMS_VERSION,
  academyInvoiceFooter,
  isAcademyTosConsentEnabled,
} from "./academyLegal.ts";

const SRC_LIB_ACADEMY_LEGAL = new URL(
  "../../../src/lib/academyLegal.ts",
  import.meta.url,
);

function extractExportAssignment(source: string, name: string): string {
  const match = source.match(new RegExp(`export const ${name} = ([\\s\\S]*?);`));
  if (!match) {
    throw new Error(`Missing export ${name} in source`);
  }
  return match[1].trim();
}

Deno.test("shared academy legal strings stay identical to src/lib/academyLegal.ts", async () => {
  const srcText = await Deno.readTextFile(SRC_LIB_ACADEMY_LEGAL);
  const sharedText = await Deno.readTextFile(new URL("./academyLegal.ts", import.meta.url));

  for (const name of ACADEMY_LEGAL_SHARED_EXPORTS) {
    assertEquals(
      extractExportAssignment(sharedText, name),
      extractExportAssignment(srcText, name),
      `${name} drifted from src/lib/academyLegal.ts`,
    );
  }
});

Deno.test("checkout strings include the terms URL and never the seller address", () => {
  assertEquals(ACADEMY_TERMS_URL, "https://www.elsaworkflows.io/legal/academy-terms");
  assertEquals(ACADEMY_TERMS_PATH, "/legal/academy-terms");
  assertEquals(
    ACADEMY_STRIPE_TOS_ACCEPTANCE.includes("https://www.elsaworkflows.io/legal/academy-terms"),
    true,
  );
  assertEquals(ACADEMY_STRIPE_SUBMIT_MESSAGE.includes(ACADEMY_REFUNDS_URL), true);
  assertEquals(ACADEMY_STRIPE_SUBMIT_MESSAGE.includes("withdrawal"), false);
  assertEquals(ACADEMY_STRIPE_SUBMIT_MESSAGE.includes("confirmed"), false);
  assertEquals(ACADEMY_CONFIRMATION_SENTENCE.includes(ACADEMY_TERMS_VERSION), true);

  const checkoutStrings = [
    ACADEMY_STRIPE_TOS_ACCEPTANCE,
    ACADEMY_STRIPE_SUBMIT_MESSAGE,
    ACADEMY_CONFIRMATION_SENTENCE,
    ACADEMY_SELLER_FOOTER_LINE,
    ACADEMY_INVOICE_FOOTER,
    ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX,
  ];
  for (const text of checkoutStrings) {
    assertEquals(text.includes("Meervelderweg"), false, text);
    assertEquals(text.includes("3888"), false, text);
    assertEquals(/[\u2013\u2014]/.test(text), false, text);
  }
});

Deno.test("invoice footer includes the waiver sentence only when consent is collected", () => {
  assertEquals(
    ACADEMY_SELLER_FOOTER_LINE,
    "Skywalker Digital BV, trading as Valence Works, KvK 88244520, VAT NL864551484B01",
  );
  assertEquals(
    ACADEMY_INVOICE_FOOTER,
    `${ACADEMY_CONFIRMATION_SENTENCE} ${ACADEMY_SELLER_FOOTER_LINE}`,
  );
  assertEquals(academyInvoiceFooter(true), ACADEMY_INVOICE_FOOTER);
  assertEquals(academyInvoiceFooter(false), ACADEMY_SELLER_FOOTER_LINE);
  assertEquals(academyInvoiceFooter(false).includes(ACADEMY_CONFIRMATION_SENTENCE), false);
});

Deno.test("statement descriptor suffix stays within Stripe length rules", () => {
  assertEquals(ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX, "ELSA ACADEMY");
  assertEquals(ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX.length <= 22, true);
  assertEquals(/^[A-Z0-9 ]+$/.test(ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX), true);
  assertEquals(/[<>\\'"`*]/.test(ACADEMY_STATEMENT_DESCRIPTOR_SUFFIX), false);
});

Deno.test("ToS consent is off unless ACADEMY_TOS_CONSENT_ENABLED is the string true", () => {
  assertFalse(isAcademyTosConsentEnabled({ get: () => undefined }));
  assertFalse(isAcademyTosConsentEnabled({ get: () => "false" }));
  assertFalse(isAcademyTosConsentEnabled({ get: () => "TRUE" }));
  assertEquals(isAcademyTosConsentEnabled({ get: () => "true" }), true);
});
