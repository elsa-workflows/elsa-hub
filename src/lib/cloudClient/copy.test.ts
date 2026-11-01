import { describe, expect, it } from "vitest";
import {
  CLOUD_BILLING_NOT_AVAILABLE_YET,
  CLOUD_BILLING_NOT_CONNECTED,
  CLOUD_BILLING_UNAVAILABLE,
  CLOUD_EMPTY_MESSAGE,
  cloudEngineCountLabel,
} from "./copy";

describe("cloudEngineCountLabel", () => {
  it("uses the signed empty, singular and plural forms", () => {
    expect(cloudEngineCountLabel(0)).toBe(CLOUD_EMPTY_MESSAGE);
    expect(cloudEngineCountLabel(1)).toBe("1 engine");
    expect(cloudEngineCountLabel(4)).toBe("4 engines");
  });
});

describe("cloud billing copy", () => {
  it("pins the load-failure and disconnected-checkout sentences", () => {
    expect(CLOUD_BILLING_UNAVAILABLE).toBe("We couldn't load billing. Please try again.");
    expect(CLOUD_BILLING_NOT_CONNECTED).toBe(
      "This organization isn't connected to Elsa Cloud, so checkout isn't available.",
    );
  });

  it("pins the signed gate sentence and drops the old yet/subscribe line", () => {
    expect(CLOUD_BILLING_NOT_AVAILABLE_YET).toBe("Elsa Cloud billing isn't available on the Hub.");
    expect(CLOUD_BILLING_NOT_AVAILABLE_YET).not.toBe(
      "Elsa Cloud billing isn't available yet. We'll let you know when you can subscribe.",
    );
  });
});
