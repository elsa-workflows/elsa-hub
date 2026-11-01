import { describe, expect, it } from "vitest";
import {
  CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE,
  CLOUD_BILLING_NOT_AVAILABLE_YET,
  CLOUD_EMPTY_MESSAGE,
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

  it("pins the billing-unavailable and no-Google link intros", () => {
    expect(CLOUD_BILLING_NOT_AVAILABLE_YET).toBe("Elsa Cloud billing isn't available yet.");
    expect(CLOUD_BILLING_NOT_AVAILABLE_YET).not.toMatch(/We'll let you know/);
    expect(CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE).toContain(
      "Use Microsoft or email to sign in to Elsa Cloud.",
    );
    expect(CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE).not.toMatch(/isn't available here yet/);
  });
});
