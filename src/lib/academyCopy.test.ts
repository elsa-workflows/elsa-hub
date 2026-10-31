import { afterEach, describe, expect, it, vi } from "vitest";
import { ELSA_VERSION } from "@/data/elsaVersion";
import {
  ACADEMY_GUMROAD_CLAIM_LINE,
  ACADEMY_GUMROAD_CLAIM_LIVE,
  academySoloBundleBody,
  isAcademyPaymentSuccess,
  isAcademySoloLaunchPriceActive,
} from "./academyCopy";

describe("academySoloBundleBody", () => {
  it("uses the launch price and says prices include VAT", () => {
    expect(academySoloBundleBody(true)).toBe(
      `Every self-paced course in the Academy, with the Elsa ${ELSA_VERSION} lab kit to download and unzip. €29 incl. VAT at launch until 30 Nov, then €39 incl. VAT.`,
    );
  });

  it("drops the launch sentence after the launch window", () => {
    expect(academySoloBundleBody(false)).toBe(
      `Every self-paced course in the Academy, with the Elsa ${ELSA_VERSION} lab kit to download and unzip. €39 incl. VAT.`,
    );
  });

  it("never says excl. VAT for Solo", () => {
    expect(academySoloBundleBody(true)).not.toMatch(/excl/i);
    expect(academySoloBundleBody(false)).not.toMatch(/excl/i);
  });
});

describe("isAcademySoloLaunchPriceActive", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the UTC date when the Amsterdam time zone is unavailable", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
      throw new RangeError("Invalid time zone specified: Europe/Amsterdam");
    });
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-30T23:30:00Z"))).toBe(true);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-12-01T00:00:00Z"))).toBe(false);
  });

  it("falls back to the UTC date when the formatter returns no day part", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () => ({ formatToParts: () => [] }) as unknown as Intl.DateTimeFormat,
    );
    // 23:30Z on 30 Nov is already 1 Dec in Amsterdam, so only the UTC fallback keeps it active.
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-30T23:30:00Z"))).toBe(true);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-12-01T00:00:00Z"))).toBe(false);
  });

  it("ends at midnight Amsterdam time after 30 Nov, not at midnight UTC", () => {
    // 30 Nov 23:59:59 CET is 22:59:59 UTC; 1 Dec 00:00 CET is 30 Nov 23:00 UTC.
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-30T23:59:59+01:00"))).toBe(true);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-12-01T00:00:00+01:00"))).toBe(false);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-30T23:30:00Z"))).toBe(false);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-30T22:30:00Z"))).toBe(true);
  });

  it("keeps the launch price through November, including 1 Nov", () => {
    expect(isAcademySoloLaunchPriceActive(new Date("2026-10-31T23:00:00Z"))).toBe(true);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-15T12:00:00+01:00"))).toBe(true);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-30T23:00:00Z"))).toBe(false);
  });
});

describe("academy copy flags", () => {
  it("keeps the Gumroad claim line off until grants are live", () => {
    expect(ACADEMY_GUMROAD_CLAIM_LIVE).toBe(false);
    expect(ACADEMY_GUMROAD_CLAIM_LINE).toContain("Gumroad");
  });

  it("detects ?payment=success", () => {
    expect(isAcademyPaymentSuccess("?payment=success")).toBe(true);
    expect(isAcademyPaymentSuccess("payment=success&foo=1")).toBe(true);
    expect(isAcademyPaymentSuccess("?payment=cancel")).toBe(false);
  });
});
