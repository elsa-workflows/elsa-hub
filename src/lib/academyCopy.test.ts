import { describe, expect, it } from "vitest";
import {
  ACADEMY_GUMROAD_CLAIM_LIVE,
  ACADEMY_SOLO_LAUNCH_PRICE_ACTIVE,
  ACADEMY_SOLO_LAUNCH_PRICE_EUR,
  ACADEMY_SOLO_LAUNCH_UNTIL_LABEL,
  ACADEMY_SOLO_POST_LAUNCH_PRICE_EUR,
  academySoloBundleBody,
  isAcademyPaymentSuccess,
} from "./academyCopy";

describe("academySoloBundleBody", () => {
  it("uses the launch price until 31 Oct", () => {
    expect(ACADEMY_SOLO_LAUNCH_PRICE_ACTIVE).toBe(true);
    expect(academySoloBundleBody()).toBe(
      "Every self-paced course in the Academy, with the Elsa 3.9.0 lab kit to download and unzip. €29 until 31 Oct, then €39. EUR excl. VAT.",
    );
    expect(ACADEMY_SOLO_LAUNCH_PRICE_EUR).toBe(29);
    expect(ACADEMY_SOLO_POST_LAUNCH_PRICE_EUR).toBe(39);
    expect(ACADEMY_SOLO_LAUNCH_UNTIL_LABEL).toBe("31 Oct");
  });

  it("drops the launch sentence when the 1 Nov switch is flipped", () => {
    expect(academySoloBundleBody(false)).toBe(
      "Every self-paced course in the Academy, with the Elsa 3.9.0 lab kit to download and unzip. €39. EUR excl. VAT.",
    );
  });
});

describe("academy copy flags", () => {
  it("keeps the Gumroad claim line off until grants are live", () => {
    expect(ACADEMY_GUMROAD_CLAIM_LIVE).toBe(false);
  });

  it("detects ?payment=success", () => {
    expect(isAcademyPaymentSuccess("?payment=success")).toBe(true);
    expect(isAcademyPaymentSuccess("payment=success&foo=1")).toBe(true);
    expect(isAcademyPaymentSuccess("?payment=cancel")).toBe(false);
  });
});
