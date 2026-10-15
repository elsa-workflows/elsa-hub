import { afterEach, describe, expect, it } from "vitest";
import {
  CLOUD_BFF_ACTIONS,
  CLOUD_BFF_FUNCTION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffRequest,
  type CloudBffResponse,
} from "./contract";
import { setCloudStubScenario, stubCloudClient, STUB_WORKSPACE } from "./stub";

describe("mirrored #53 cloud-bff contract", () => {
  afterEach(() => {
    setCloudStubScenario("list");
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

  it("accepts the #53 request shapes on the stub", async () => {
    setCloudStubScenario("list");
    const requests: CloudBffRequest[] = [
      { action: "compatibility" },
      { action: "bootstrap" },
      { action: "listWorkspaces" },
      { action: "selectWorkspace", workspaceId: STUB_WORKSPACE.id },
      { action: "listEngines", workspaceId: STUB_WORKSPACE.id },
      {
        action: "engineOverview",
        workspaceId: STUB_WORKSPACE.id,
        engineId: "11111111-1111-4111-8111-111111111111",
      },
    ];
    for (const body of requests) {
      const response = await stubCloudClient.invoke(body);
      expect(response.ok).toBe(true);
    }
  });

  it("returns the #53 listEngines empty and updating states", async () => {
    setCloudStubScenario("empty");
    const empty = await stubCloudClient.invoke({
      action: "listEngines",
      workspaceId: STUB_WORKSPACE.id,
    });
    expect(empty).toMatchObject({ ok: true, state: "empty", engines: [] });

    setCloudStubScenario("updating");
    const updating = await stubCloudClient.invoke({ action: "bootstrap" });
    expect(isCloudUpdating(updating)).toBe(true);
  });
});
