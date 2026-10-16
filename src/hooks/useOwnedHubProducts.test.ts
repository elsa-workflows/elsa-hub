import { describe, expect, it } from "vitest";
import { shouldShowOrgCloudNav } from "./useOwnedHubProducts";

describe("shouldShowOrgCloudNav", () => {
  it("keeps Cloud visible without a localStorage setup marker", () => {
    expect(shouldShowOrgCloudNav()).toBe(true);
  });
});
