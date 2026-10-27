import { describe, expect, it } from "vitest";
import {
  CLOUD_TERMS_CONTACT,
  CLOUD_TERMS_HERO,
  CLOUD_TERMS_INTRO,
  CLOUD_TERMS_PATH,
  CLOUD_TERMS_SECTIONS,
} from "./cloudLegal";

const allText = [
  CLOUD_TERMS_HERO.lede,
  CLOUD_TERMS_HERO.note,
  ...CLOUD_TERMS_HERO.facts.map((f) => `${f.label} ${f.value}`),
  CLOUD_TERMS_INTRO.body,
  CLOUD_TERMS_INTRO.caveat,
  CLOUD_TERMS_CONTACT.body,
  ...CLOUD_TERMS_SECTIONS.flatMap((s) => [s.title, s.summary, ...s.points]),
].join("\n");

describe("cloudLegal", () => {
  it("lives under /legal", () => {
    expect(CLOUD_TERMS_PATH).toBe("/legal/cloud-terms");
  });

  it("keeps the seven Early Access sections in order", () => {
    expect(CLOUD_TERMS_SECTIONS.map((s) => s.id)).toEqual([
      "scope",
      "service-and-pricing",
      "payment",
      "hosting-support",
      "content-and-ip",
      "retention-and-ending",
      "law-and-contact",
    ]);
  });

  it("prices Hosted at €99 per month per dedicated engine, billed monthly", () => {
    expect(allText).toMatch(/€99 per month per dedicated engine/);
    expect(allText).toMatch(/renew monthly until cancelled/);
  });

  it("presents BYO Azure as waitlist only, not a plan you can buy", () => {
    const byo = CLOUD_TERMS_HERO.facts.find((f) => f.label === "BYO");
    expect(byo?.value).toMatch(/coming soon/);
    expect(byo?.value).toMatch(/waitlist/);
    expect(CLOUD_TERMS_HERO.note).toMatch(/BYO Azure remains waitlist-only/);
  });

  it("states no trial length and no other tiers or DPA", () => {
    expect(allText).toMatch(/free Hosted (Preview )?trial/);
    expect(allText).not.toMatch(/\d+[- ]days?\b[^.]*trial|trial[^.]*\d+[- ]days?/i);
    expect(allText).not.toMatch(/\bDPA\b|Data Processing Agreement/i);
    expect(allText).not.toMatch(/elsacloud\.app/);
  });

  it("names the seller the same way as the Academy terms, with KvK and VAT", () => {
    expect(allText).toMatch(/Skywalker Digital BV, registered .* KvK 88244520, VAT NL864551484B01/);
    expect(CLOUD_TERMS_CONTACT.body).toMatch(/Skywalker Digital BV trading as Valence Works/);
    expect(allText).not.toMatch(/B\.V\./);
  });

  it("states no contractual SLO", () => {
    expect(CLOUD_TERMS_INTRO.caveat).toMatch(/no contractual SLO/);
  });
});
