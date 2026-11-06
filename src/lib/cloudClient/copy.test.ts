import { describe, expect, it } from "vitest";
import {
  CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE,
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
      "Elsa Cloud isn't connected to this Hub organization yet.",
    );
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
