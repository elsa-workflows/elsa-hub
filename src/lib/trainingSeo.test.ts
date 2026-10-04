import { describe, expect, it } from "vitest";
import { FUNDAMENTALS_CORE_GUMROAD_URL } from "./trainingInterest";
import {
  TRAINING_CANONICAL_URL,
  TRAINING_OFFER_CURRENCY,
  TRAINING_OFFER_PRICE,
  TRAINING_OG_IMAGE_URL,
  TRAINING_PRICE_VALID_UNTIL,
  trainingCourseJsonLd,
} from "./trainingSeo";
import { buildTrainingBody, buildTrainingHead } from "./trainingSeo";

describe("training Course JSON-LD", () => {
  it("describes a paid Course offer without courseWorkload", () => {
    const ld = trainingCourseJsonLd();
    expect(ld["@type"]).toBe("Course");
    expect(ld.url).toBe("https://www.elsaworkflows.io/elsa-plus/training");
    expect(TRAINING_CANONICAL_URL).toBe("https://www.elsaworkflows.io/elsa-plus/training");
    expect(TRAINING_OG_IMAGE_URL).toBe("https://www.elsaworkflows.io/og-training.png");
    expect(ld.image).toBe(TRAINING_OG_IMAGE_URL);
    expect(ld).not.toHaveProperty("courseWorkload");
    expect(JSON.stringify(ld)).not.toMatch(/courseWorkload/);

    const offers = ld.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe(TRAINING_OFFER_PRICE);
    expect(offers.price).toBe("29");
    expect(offers.priceCurrency).toBe(TRAINING_OFFER_CURRENCY);
    expect(offers.priceValidUntil).toBe(TRAINING_PRICE_VALID_UNTIL);
    expect(offers.priceValidUntil).toBe("2026-10-31");
    expect(offers.url).toBe(FUNDAMENTALS_CORE_GUMROAD_URL);

    const instance = ld.hasCourseInstance as Record<string, unknown>;
    expect(instance["@type"]).toBe("CourseInstance");
    expect(instance).not.toHaveProperty("courseWorkload");
  });
});

describe("training prerender fragments", () => {
  it("emits title, canonical, og:url, and Course JSON-LD", () => {
    const head = buildTrainingHead();
    expect(head).toMatch(/<title>/);
    expect(head).toContain('rel="canonical"');
    expect(head).toContain('property="og:url"');
    expect(head).toContain("https://www.elsaworkflows.io/elsa-plus/training");
    expect(head).toContain("application/ld+json");
    expect(head).toContain('"@type":"Course"');
    expect(head).not.toContain("courseWorkload");
    expect(head).not.toMatch(/[\u2013\u2014]/);

    const body = buildTrainingBody();
    expect(body).toMatch(/<h1>/);
    expect(body).toContain("Solo Bundle");
    expect(body).not.toMatch(/[\u2013\u2014]/);
  });
});
