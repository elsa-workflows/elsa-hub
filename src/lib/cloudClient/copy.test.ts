import { describe, expect, it } from "vitest";
import {
  CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE,
  CLOUD_BILLING_NOT_AVAILABLE,
  CLOUD_BILLING_NOT_CONNECTED,
  CLOUD_BILLING_NO_CUSTOMER,
  CLOUD_BILLING_UNAVAILABLE,
  CLOUD_DELETE_START_ERROR,
  CLOUD_EMPTY_MESSAGE,
  CLOUD_LINK_ORG_NOT_CONNECTED,
  CLOUD_LINK_ORG_UNREACHABLE,
  CLOUD_PREVIEW_ONE_USER,
  CLOUD_UNREACHABLE_HEADING,
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
      "This Hub organization isn't connected to Elsa Cloud.",
    );
  });
});

describe("signed Cloud billing copy (elsa-control#936)", () => {
  it("pins the signed billing-unavailable line", () => {
    expect(CLOUD_BILLING_UNAVAILABLE).toBe(
      "We couldn't load billing. Refresh this page to check again.",
    );
  });

  it("pins the signed no-billing-account line", () => {
    expect(CLOUD_BILLING_NO_CUSTOMER).toBe(
      "This organization has no billing account on the Hub, so the billing portal isn't available.",
    );
  });
});

describe("cloud billing copy", () => {
  it("pins the load-failure and disconnected-checkout sentences", () => {
    expect(CLOUD_BILLING_UNAVAILABLE).toBe("We couldn't load billing. Refresh this page to check again.");
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

describe("signed Cloud action errors", () => {
  it("pins the signed delete-start error", () => {
    expect(CLOUD_DELETE_START_ERROR).toBe(
      "We couldn't start deleting this engine. Please try again. If it keeps failing, email hello@valence.works with this engine's name and we'll help during business hours.",
    );
  });
});

describe("unreachable-state copy", () => {
  const retiredLinking =
    "Elsa Cloud isn't available for linking yet. Please try again later.";

  it("pins the signed unreachable heading", () => {
    expect(CLOUD_UNREACHABLE_HEADING).toBe("Elsa Cloud can't be reached");
    expect(CLOUD_UNREACHABLE_HEADING).not.toMatch(/[.]/);
  });

  it("pins the signed linking-unreachable sentence", () => {
    expect(CLOUD_LINK_ORG_UNREACHABLE).toBe(
      "Elsa Cloud can't be reached, so linking isn't available. Refresh this page to check again.",
    );
    expect(CLOUD_LINK_ORG_UNREACHABLE).not.toBe(retiredLinking);
    expect(CLOUD_LINK_ORG_UNREACHABLE).not.toMatch(/yet/i);
    expect(CLOUD_LINK_ORG_UNREACHABLE).not.toMatch(/try again later/i);
    expect(CLOUD_LINK_ORG_UNREACHABLE).not.toMatch(/temporarily/i);
  });
});
