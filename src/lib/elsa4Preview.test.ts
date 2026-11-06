import { describe, expect, it } from "vitest";
import {
  ELSA4_PREVIEW_GUIDES,
  ELSA4_PREVIEW_SECTIONS,
} from "./elsa4Preview";

describe("Elsa 4 preview docs URLs", () => {
  it("points at canonical v4 paths, not the doubled Mintlify section slugs", () => {
    const hrefs = [
      ...ELSA4_PREVIEW_SECTIONS.map((section) => section.href),
      ...ELSA4_PREVIEW_GUIDES.map((guide) => guide.href),
    ];

    expect(hrefs).toEqual([
      "https://v4.elsaworkflows.io/essentials",
      "https://v4.elsaworkflows.io/extensions",
      "https://v4.elsaworkflows.io/studio",
      "https://v4.elsaworkflows.io/essentials/quickstart",
      "https://v4.elsaworkflows.io/essentials/first-workflow",
      "https://v4.elsaworkflows.io/contributing",
    ]);
    expect(hrefs.join("\n")).not.toMatch(/\/(essentials|extensions|studio|contributing)\/\1(?:\/|$)/);
  });
});
