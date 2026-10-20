import { describe, expect, it } from "vitest";
import {
  ACADEMY_CHECKOUT_NOTICE,
  ACADEMY_CONFIRMATION_SENTENCE,
  ACADEMY_SELLER,
  ACADEMY_STRIPE_SUBMIT_MESSAGE,
  ACADEMY_STRIPE_TOS_ACCEPTANCE,
  ACADEMY_TERMS_SECTIONS,
  ACADEMY_WAIVER_CHECKBOX_LABEL,
} from "./academyLegal";

describe("academyLegal", () => {
  it("keeps Stripe custom_text within the 1200-character limit", () => {
    expect(ACADEMY_STRIPE_TOS_ACCEPTANCE.length).toBeLessThanOrEqual(1200);
    expect(ACADEMY_STRIPE_SUBMIT_MESSAGE.length).toBeLessThanOrEqual(1200);
  });

  it("states both parts of the art. 16(m) waiver in the checkbox label", () => {
    expect(ACADEMY_WAIVER_CHECKBOX_LABEL).toMatch(/straight away/);
    expect(ACADEMY_WAIVER_CHECKBOX_LABEL).toMatch(/lose my 14-day right of withdrawal/);
    expect(ACADEMY_CONFIRMATION_SENTENCE).toMatch(/lose your 14-day right of withdrawal/);
  });

  it("has a refunds anchor and no em or en dashes", () => {
    expect(ACADEMY_TERMS_SECTIONS.map((s) => s.id)).toContain("refunds");
    const all = [
      ACADEMY_WAIVER_CHECKBOX_LABEL,
      ACADEMY_STRIPE_TOS_ACCEPTANCE,
      ACADEMY_CONFIRMATION_SENTENCE,
      ...ACADEMY_TERMS_SECTIONS.map((s) => s.title + s.body),
    ].join("\n");
    expect(all).not.toMatch(/[\u2013\u2014]/);
  });

  it("fills in the seller details with no placeholders left", () => {
    const seller = ACADEMY_TERMS_SECTIONS.find((s) => s.id === "seller")!.body;
    expect(seller).toContain("Skywalker Digital BV, trading as Valence Works");
    expect(seller).toContain("KvK): 88244520");
    expect(seller).toContain("NL864551484B01");
    expect(seller).toContain(ACADEMY_SELLER.address);
    const all = ACADEMY_TERMS_SECTIONS.map((s) => s.body).join("\n");
    expect(all).not.toMatch(/PLACEHOLDER/);
  });

  it("shows Solo prices including VAT and Team prices excluding VAT", () => {
    const prices = ACADEMY_TERMS_SECTIONS.find((s) => s.id === "prices")!.body;
    expect(prices).toContain("€29 including VAT until 31 Oct 2026");
    expect(prices).toContain("€39 including VAT");
    expect(prices).toContain("€349 excluding VAT");
    expect(prices).toContain("€599 excluding VAT");
    expect(ACADEMY_CHECKOUT_NOTICE).toMatch(/Solo Bundle prices include VAT/);
  });

  it("keeps the seller address out of checkout and email text", () => {
    for (const text of [
      ACADEMY_CHECKOUT_NOTICE,
      ACADEMY_WAIVER_CHECKBOX_LABEL,
      ACADEMY_STRIPE_TOS_ACCEPTANCE,
      ACADEMY_STRIPE_SUBMIT_MESSAGE,
      ACADEMY_CONFIRMATION_SENTENCE,
    ]) {
      expect(text).not.toMatch(/Meervelderweg|Uddel/);
    }
  });
});
