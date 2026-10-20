import { describe, expect, it } from "vitest";
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
      "Every self-paced course in the Academy, with the Elsa 3.9.0 lab kit to download and unzip. €29 incl. VAT at launch until 31 Oct, then €39 incl. VAT.",
    );
  });

  it("drops the launch sentence after the launch window", () => {
    expect(academySoloBundleBody(false)).toBe(
      "Every self-paced course in the Academy, with the Elsa 3.9.0 lab kit to download and unzip. €39 incl. VAT.",
    );
  });

  it("never says excl. VAT for Solo", () => {
    expect(academySoloBundleBody(true)).not.toMatch(/excl/i);
    expect(academySoloBundleBody(false)).not.toMatch(/excl/i);
  });
});

describe("isAcademySoloLaunchPriceActive", () => {
  it("switches on the day after TRAINING_PRICE_VALID_UNTIL (UTC)", () => {
    expect(isAcademySoloLaunchPriceActive(new Date("2026-10-31T23:59:59Z"))).toBe(true);
    expect(isAcademySoloLaunchPriceActive(new Date("2026-11-01T00:00:00Z"))).toBe(false);
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
