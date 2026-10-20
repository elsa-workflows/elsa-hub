import { describe, expect, it } from "vitest";
import {
  CLOUD_BFF_ACTIONS,
  CLOUD_BFF_CONTROL_ENDPOINTS,
  CLOUD_BFF_FUNCTION,
  CLOUD_LIMIT_CODE,
  CLOUD_LIMIT_MESSAGE,
  CLOUD_ORG_LINK_CONFLICT,
  CLOUD_ORG_LINK_CONFLICT_CODE,
  CLOUD_REQUIRED_CAPABILITIES,
  CLOUD_SUPPORTED_CONTRACT_VERSION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  isCloudBffError,
  isCloudLimitReached,
  isCloudTerminalOperationState,
  isCloudUpdating,
  type CloudBffRequest,
  type CloudBffResponse,
} from "./actions";

describe("cloud-bff action contract", () => {
  it("exports the read and lifecycle actions", () => {
    expect(CLOUD_BFF_FUNCTION).toBe("cloud-bff");
    expect([...CLOUD_BFF_ACTIONS]).toEqual([
      "compatibility",
      "bootstrap",
      "listWorkspaces",
      "selectWorkspace",
      "listEngines",
      "engineOverview",
      "onboardingOptions",
      "createEngine",
      "provisioningProgress",
      "engineActivity",
      "availableReleases",
      "restartEngine",
      "applyRelease",
      "confirmDelete",
      "deleteEngine",
      "deleteOperationStatus",
      "issueStudioHandoff",
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
      "hosted.instances.create.v1",
      "hosted.instances.status.v1",
      "hosted.instances.provisioning-progress.v1",
      "hosted.instances.overview.v1",
      "hosted.studio.handoff.issue.v1",
      "hosted.instances.quota-problem.v1",
      "hosted.instances.confirmed-delete.v1",
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

  it("sanitizes the plan-limit envelope", () => {
    const limit: CloudBffResponse = {
      ok: false,
      code: CLOUD_LIMIT_CODE,
      error: CLOUD_LIMIT_MESSAGE,
      currentInstances: 1,
      maxInstances: 1,
    };
    expect(isCloudLimitReached(limit)).toBe(true);
    expect(isCloudUpdating(limit)).toBe(false);
  });

  it("sanitizes a Hub-to-Control organization link conflict", () => {
    const conflict: CloudBffResponse = {
      ok: false,
      code: CLOUD_ORG_LINK_CONFLICT_CODE,
      error: CLOUD_ORG_LINK_CONFLICT,
    };
    expect(isCloudBffError(conflict)).toBe(true);
    expect(conflict.error).toBe(
      "This organization is already linked to a different Elsa Cloud account. That link cannot be changed here.",
    );
  });

  it("treats succeeded delete operations as terminal", () => {
    expect(isCloudTerminalOperationState("Succeeded")).toBe(true);
    expect(isCloudTerminalOperationState("Accepted")).toBe(false);
  });

  it("documents the request fields each action accepts", () => {
    const workspaceId = "11111111-1111-1111-1111-111111111111";
    const engineId = "22222222-2222-2222-2222-222222222222";
    const requests: CloudBffRequest[] = [
      { action: "compatibility" },
      { action: "bootstrap" },
      { action: "bootstrap", hubOrganizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      { action: "listWorkspaces" },
      { action: "selectWorkspace", workspaceId },
      { action: "listEngines", workspaceId },
      { action: "engineOverview", workspaceId, engineId },
      { action: "onboardingOptions", workspaceId },
      {
        action: "createEngine",
        workspaceId,
        name: "Prod",
        slug: "prod",
        intent: {
          release: {
            distributionId: "valence-runtime",
            releaseLine: "3.8",
            requestedVersion: "3.8.4",
            channel: "stable",
            patchUpdates: "automatic-within-minor",
            minorUpdates: "explicit-approval",
            majorMigrations: "explicit-migration",
          },
          application: {
            topologyId: "combined",
            featurePresetId: null,
            featureOverrides: {},
            packagePolicy: null,
            configurationShapeRevisionId: null,
          },
          placement: {
            targetMode: "managed",
            regionCode: "westeurope",
            isolationProfile: "dedicated",
            capacityProfile: "standard-small",
            networkOutcome: "public",
            domainOutcome: "managed",
          },
          desiredLifecycle: "Running",
        },
        idempotencyKey: "44444444-4444-4444-4444-444444444444",
      },
      { action: "provisioningProgress", workspaceId, engineId },
      { action: "engineActivity", workspaceId, engineId },
      { action: "availableReleases", workspaceId, engineId },
      {
        action: "restartEngine",
        workspaceId,
        engineId,
        idempotencyKey: "44444444-4444-4444-4444-444444444444",
        ifMatch: '"1"',
      },
      {
        action: "applyRelease",
        workspaceId,
        engineId,
        version: "3.8.5",
        idempotencyKey: "44444444-4444-4444-4444-444444444444",
        ifMatch: '"1"',
      },
      { action: "confirmDelete", workspaceId, engineId },
      {
        action: "deleteEngine",
        workspaceId,
        engineId,
        deleteConfirmationId: "66666666-6666-6666-6666-666666666666",
        idempotencyKey: "44444444-4444-4444-4444-444444444444",
        ifMatch: '"1"',
      },
      {
        action: "deleteOperationStatus",
        workspaceId,
        engineId,
        operationId: "55555555-5555-5555-5555-555555555555",
      },
      {
        action: "issueStudioHandoff",
        organizationId: "33333333-3333-3333-3333-333333333333",
        engineId,
        audience: "https://studio.example",
        redirectUri: "https://studio.example/handoff",
        codeChallenge: "challenge",
      },
    ];
    expect(requests.filter((request) => request.action === "bootstrap")).toHaveLength(2);
    expect(requests).toHaveLength(CLOUD_BFF_ACTIONS.length + 1);
  });
});
