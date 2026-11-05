import { describe, expect, it } from "vitest";
import {
  CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE,
  CLOUD_BILLING_NOT_AVAILABLE,
  CLOUD_BILLING_NOT_CONNECTED,
  CLOUD_BILLING_UNAVAILABLE,
  CLOUD_EMPTY_MESSAGE,
  CLOUD_LINK_ORG_NOT_CONNECTED,
  CLOUD_PREVIEW_ONE_USER,
  cloudEngineCountLabel,
} from "./copy";

describe("cloudEngineCountLabel", () => {
  it("uses the signed empty, singular and plural forms", () => {
    expect(cloudEngineCountLabel(0)).toBe(CLOUD_EMPTY_MESSAGE);
    expect(cloudEngineCountLabel(1)).toBe("1 engine");
    expect(cloudEngineCountLabel(4)).toBe("4 engines");
  });

  it("pins the Preview one-user limit", () => {
    expect(CLOUD_PREVIEW_ONE_USER).toBe(
      "During Preview, each organization has one Elsa Cloud user.",
    );
  });

  it("pins the no-Google link intro", () => {
    expect(CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE).toContain(
      "Use Microsoft or email to sign in to Elsa Cloud.",
    );
    expect(CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE).not.toMatch(/isn't available here yet/);
  });

  it("pins the signed non-admin disconnected line", () => {
    expect(CLOUD_LINK_ORG_NOT_CONNECTED).toBe(
      "Elsa Cloud isn't connected to this Hub organization yet.",
    );
  });
});

describe("cloud billing copy", () => {
  it("pins the load-failure and disconnected-checkout sentences", () => {
    expect(CLOUD_BILLING_UNAVAILABLE).toBe("We couldn't load billing. Please try again.");
    expect(CLOUD_BILLING_NOT_CONNECTED).toBe(
      "This organization isn't connected to Elsa Cloud, so checkout isn't available.",
    );
  });

  it("pins the signed Hub billing-gate sentence", () => {
    expect(CLOUD_BILLING_NOT_AVAILABLE).toBe("Elsa Cloud billing isn't available on the Hub.");
  });

  it("never keeps the old yet/subscribe billing-gate sentence", () => {
    const retired =
      "Elsa Cloud billing isn't available yet. We'll let you know when you can subscribe.";
    expect(CLOUD_BILLING_NOT_AVAILABLE).not.toBe(retired);
    expect(CLOUD_BILLING_UNAVAILABLE).not.toBe(retired);
    expect(CLOUD_BILLING_NOT_CONNECTED).not.toBe(retired);
  });
});
