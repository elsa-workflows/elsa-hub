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

  it("exports the six read actions from #53", () => {
    expect(CLOUD_BFF_FUNCTION).toBe("cloud-bff");
    expect([...CLOUD_BFF_ACTIONS]).toEqual([
      "compatibility",
      "bootstrap",
      "listWorkspaces",
      "selectWorkspace",
      "listEngines",
      "engineOverview",
    ]);
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
