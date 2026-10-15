import { describe, expect, it } from "vitest";
import {
  CLOUD_BFF_ACTIONS,
  CLOUD_BFF_CONTROL_ENDPOINTS,
  CLOUD_BFF_FUNCTION,
  CLOUD_REQUIRED_CAPABILITIES,
  CLOUD_SUPPORTED_CONTRACT_VERSION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  isCloudBffError,
  isCloudUpdating,
  type CloudBffRequest,
  type CloudBffResponse,
} from "./actions";

describe("cloud-bff action contract", () => {
  it("exports the six read actions #45 should call", () => {
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

  it("maps each action to exactly one Control endpoint", () => {
    for (const action of CLOUD_BFF_ACTIONS) {
      const mapping = CLOUD_BFF_CONTROL_ENDPOINTS[action];
      expect(mapping.method).toMatch(/^(GET|POST)$/);
      expect(mapping.path.startsWith("/api/")).toBe(true);
    }
  });

  it("keeps the Hub-required compatibility floor", () => {
    expect(CLOUD_SUPPORTED_CONTRACT_VERSION).toBe(1);
    expect([...CLOUD_REQUIRED_CAPABILITIES]).toEqual([
      "cloud.bootstrap.v1",
      "hosted.instances.list.v1",
      "hosted.instances.status.v1",
      "hosted.instances.overview.v1",
    ]);
  });

  it("uses the sanitized updating envelope, not an upstream body", () => {
    const updating: CloudBffResponse = {
      ok: false,
      state: "updating",
      code: CLOUD_UPDATING_CODE,
      error: CLOUD_UPDATING_MESSAGE,
    };
    expect(isCloudUpdating(updating)).toBe(true);
    expect(isCloudBffError(updating)).toBe(false);
    expect(updating.error).toBe(
      "Elsa Cloud is being updated. Managed engine actions are temporarily paused.",
    );
  });

  it("distinguishes client errors from the updating state", () => {
    const error: CloudBffResponse = {
      ok: false,
      code: "unknown_action",
      error: "Unknown action.",
    };
    expect(isCloudBffError(error)).toBe(true);
    expect(isCloudUpdating(error)).toBe(false);
  });

  it("documents the request fields each action accepts", () => {
    const requests: CloudBffRequest[] = [
      { action: "compatibility" },
      { action: "bootstrap" },
      { action: "listWorkspaces" },
      { action: "selectWorkspace", workspaceId: "11111111-1111-1111-1111-111111111111" },
      { action: "listEngines", workspaceId: "11111111-1111-1111-1111-111111111111" },
      {
        action: "engineOverview",
        workspaceId: "11111111-1111-1111-1111-111111111111",
        engineId: "22222222-2222-2222-2222-222222222222",
      },
    ];
    expect(requests).toHaveLength(CLOUD_BFF_ACTIONS.length);
  });
});
