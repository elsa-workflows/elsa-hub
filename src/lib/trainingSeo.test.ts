import { describe, expect, it } from "vitest";
import { FUNDAMENTALS_CORE_GUMROAD_URL } from "./trainingInterest";
import {
  TRAINING_CANONICAL_URL,
  TRAINING_INTRO,
  TRAINING_LAUNCH_PRICE_EUR,
  TRAINING_LAUNCH_UNTIL_LABEL,
  TRAINING_OFFER_CURRENCY,
  TRAINING_OFFER_PRICE,
  TRAINING_OG_IMAGE_URL,
  TRAINING_POST_LAUNCH_PRICE_EUR,
  TRAINING_PRICE_VALID_UNTIL,
  TRAINING_PROVIDER_SAME_AS,
  TRAINING_REGULAR_PRICE_VALID_FROM,
  trainingCourseJsonLd,
} from "./trainingSeo";
import { buildTrainingBody, buildTrainingHead } from "./trainingSeo";

describe("training Course JSON-LD", () => {
  it("describes a paid Course offer without courseWorkload", () => {
    const ld = trainingCourseJsonLd();
    expect(ld["@type"]).toBe("Course");
    expect(ld.url).toBe("https://www.elsaworkflows.io/elsa-plus/training");
    expect(ld.inLanguage).toBe("en");
    expect(TRAINING_CANONICAL_URL).toBe("https://www.elsaworkflows.io/elsa-plus/training");
    expect(TRAINING_OG_IMAGE_URL).toBe("https://www.elsaworkflows.io/og-training.png");
    expect(ld.image).toBe(TRAINING_OG_IMAGE_URL);
    expect(ld).not.toHaveProperty("courseWorkload");
    expect(JSON.stringify(ld)).not.toMatch(/courseWorkload/);

    const provider = ld.provider as Record<string, unknown>;
    expect(provider.url).toBe("https://www.elsaworkflows.io");
    expect(provider.sameAs).toBe(TRAINING_PROVIDER_SAME_AS);
    expect(provider.sameAs).toBe("https://github.com/elsa-workflows");
    expect(provider.sameAs).not.toBe(provider.url);

    const offers = ld.offers as Record<string, unknown>[];
    expect(offers).toHaveLength(2);
    expect(offers[0]["@type"]).toBe("Offer");
    expect(offers[0].price).toBe(TRAINING_OFFER_PRICE);
    expect(offers[0].price).toBe(String(TRAINING_LAUNCH_PRICE_EUR));
    expect(offers[0].price).toBe("29");
    expect(offers[0].priceCurrency).toBe(TRAINING_OFFER_CURRENCY);
    expect(offers[0].priceValidUntil).toBe(TRAINING_PRICE_VALID_UNTIL);
    expect(offers[0].priceValidUntil).toBe("2026-10-31");
    expect(offers[0].url).toBe(FUNDAMENTALS_CORE_GUMROAD_URL);
    expect(offers[1]["@type"]).toBe("Offer");
    expect(offers[1].price).toBe(String(TRAINING_POST_LAUNCH_PRICE_EUR));
    expect(offers[1].price).toBe("39");
    expect(offers[1].validFrom).toBe(TRAINING_REGULAR_PRICE_VALID_FROM);
    expect(offers[1].validFrom).toBe("2026-11-01");
    expect(offers[1].url).toBe(FUNDAMENTALS_CORE_GUMROAD_URL);
    expect(TRAINING_LAUNCH_UNTIL_LABEL).toBe("31 Oct");
    expect(TRAINING_POST_LAUNCH_PRICE_EUR).toBe(39);

    const instance = ld.hasCourseInstance as Record<string, unknown>;
    expect(instance["@type"]).toBe("CourseInstance");
    expect(instance).not.toHaveProperty("courseWorkload");
  });
});

describe("training prerender fragments", () => {
  it("emits title, canonical, og:url, and Course JSON-LD with data-rh", () => {
    const head = buildTrainingHead();
    expect(head).toMatch(/<title data-rh="true">/);
    expect(head).toContain('rel="canonical"');
    expect(head).toContain('property="og:url"');
    expect(head).toContain("https://www.elsaworkflows.io/elsa-plus/training");
    expect(head).toContain("application/ld+json");
    expect(head).toContain('"@type":"Course"');
    expect(head).toContain('"inLanguage":"en"');
    expect(head).not.toContain("courseWorkload");
    expect(head).not.toMatch(/[\u2013\u2014]/);
    expect(head.match(/data-rh="true"/g)?.length).toBeGreaterThanOrEqual(14);

    const body = buildTrainingBody();
    expect(body).toMatch(/<h1>/);
    expect(body).toContain(TRAINING_INTRO);
    expect(body).toContain("Solo Bundle");
    expect(body).not.toMatch(/[\u2013\u2014]/);
  });
});
