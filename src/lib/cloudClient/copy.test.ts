import { describe, expect, it } from "vitest";
import {
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
});
