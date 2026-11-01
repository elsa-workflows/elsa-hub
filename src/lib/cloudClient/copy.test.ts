import { describe, expect, it } from "vitest";
import {
  CLOUD_DELETE_START_ERROR,
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

describe("signed Cloud action errors", () => {
  it("pins the signed delete-start error", () => {
    expect(CLOUD_DELETE_START_ERROR).toBe(
      "We couldn't start deleting this engine. Please try again. If it keeps failing, email hello@valence.works with this engine's name and we'll help during business hours.",
    );
  });
});
