import {
  CLOUD_REQUIRED_CAPABILITIES,
  CLOUD_SUPPORTED_CONTRACT_VERSION,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  type CloudBffClientError,
  type CloudBffRequest,
  type CloudBffResponse,
  type CloudEngineOverview,
  type CloudEngineSummary,
  type CloudUpdatingState,
  type CloudWorkspace,
} from "@/lib/cloud";

export type CloudStubScenario = "empty" | "list" | "updating" | "needsSetup";

export const STUB_WORKSPACE: CloudWorkspace = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Default",
  kind: "cloud",
  role: "owner",
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  organizationName: "Example",
  organizationRole: "owner",
};

export const STUB_ENGINES: CloudEngineSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Production",
    slug: "production",
    status: "Ready",
    release: "3.8.4",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Staging",
    slug: "staging",
    status: "Provisioning",
    release: "3.9.0",
  },
];

export const STUB_ENGINE_OVERVIEWS: CloudEngineOverview[] = STUB_ENGINES.map((engine) => ({
  ...engine,
  health: engine.status === "Ready" ? "Healthy" : "Unknown",
  canOpen: engine.status === "Ready",
}));

let scenario: CloudStubScenario = "list";

export function setCloudStubScenario(next: CloudStubScenario) {
  scenario = next;
}

export function getCloudStubScenario(): CloudStubScenario {
  return scenario;
}

const updating = (): CloudUpdatingState => ({
  ok: false,
  state: "updating",
  code: CLOUD_UPDATING_CODE,
  error: CLOUD_UPDATING_MESSAGE,
});

function requireWorkspace(workspaceId: string): CloudBffClientError | null {
  if (workspaceId !== STUB_WORKSPACE.id) {
    return { ok: false, code: "not_found", error: "Workspace not found." };
  }
  return null;
}

export const stubCloudClient = {
  async invoke(body: CloudBffRequest): Promise<CloudBffResponse> {
    if (scenario === "updating") return updating();

    switch (body.action) {
      case "compatibility":
        return {
          ok: true,
          state: "compatible",
          contractVersion: CLOUD_SUPPORTED_CONTRACT_VERSION,
          capabilities: [...CLOUD_REQUIRED_CAPABILITIES],
        };
      case "bootstrap":
        if (scenario === "needsSetup") {
          scenario = "empty";
        }
        return {
          ok: true,
          state: "ready",
          organizationId: STUB_WORKSPACE.organizationId,
          workspaceId: STUB_WORKSPACE.id,
        };
      case "listWorkspaces":
        if (scenario === "needsSetup") {
          return { ok: true, state: "ready", workspaces: [] };
        }
        return { ok: true, state: "ready", workspaces: [STUB_WORKSPACE] };
      case "selectWorkspace": {
        const missing = requireWorkspace(body.workspaceId);
        if (missing) return missing;
        return { ok: true, state: "ready", workspace: STUB_WORKSPACE };
      }
      case "listEngines": {
        const missing = requireWorkspace(body.workspaceId);
        if (missing) return missing;
        if (scenario === "empty") {
          return { ok: true, state: "empty", workspaceId: body.workspaceId, engines: [] };
        }
        return { ok: true, state: "ready", workspaceId: body.workspaceId, engines: STUB_ENGINES };
      }
      case "engineOverview": {
        const missing = requireWorkspace(body.workspaceId);
        if (missing) return missing;
        const engine = STUB_ENGINE_OVERVIEWS.find((item) => item.id === body.engineId);
        if (!engine) {
          return { ok: false, code: "not_found", error: "Engine not found." };
        }
        return { ok: true, state: "ready", workspaceId: body.workspaceId, engine };
      }
    }
  },
};
