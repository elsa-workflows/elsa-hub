import { describe, expect, it } from "vitest";
import {
  CLOUD_BFF_ACTIONS,
  CLOUD_BFF_FUNCTION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffResponse,
} from "@/lib/cloudClient";

describe("cloud-bff contract via @/lib/cloud", () => {
  it("does not re-export a stub from the barrel", async () => {
    const barrel = await import("@/lib/cloudClient");
    expect("stubCloudClient" in barrel).toBe(false);
    expect("setCloudStubScenario" in barrel).toBe(false);
    expect("STUB_ENGINES" in barrel).toBe(false);
  });

  it("exports the #53 read actions plus the #48 lifecycle actions", () => {
    expect(CLOUD_BFF_FUNCTION).toBe("cloud-bff");
    expect(CLOUD_BFF_ACTIONS).toContain("listEngines");
    expect(CLOUD_BFF_ACTIONS).toContain("createEngine");
    expect(CLOUD_BFF_ACTIONS).toContain("deleteEngine");
    expect(CLOUD_BFF_ACTIONS).toContain("linkCloudAccount");
    expect(CLOUD_BFF_ACTIONS).toHaveLength(18);
  });

  it("uses the sanitized updating envelope from #53", () => {
    const updating: CloudBffResponse = {
      ok: false,
      state: "updating",
      code: CLOUD_UPDATING_CODE,
      error: CLOUD_UPDATING_MESSAGE,
    };
    expect(isCloudUpdating(updating)).toBe(true);
    expect(isCloudBffError(updating)).toBe(false);
  });
});
