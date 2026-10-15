/**
 * cloud-bff action contract for the Hub /cloud console.
 *
 * Issue #45 (and later Cloud leaves) must import these types rather than
 * inventing a parallel request or response shape. The Edge Function in
 * `supabase/functions/cloud-bff` and the helpers in
 * `supabase/functions/_shared/cloud*` implement the same contract.
 *
 * Invoke with `supabase.functions.invoke("cloud-bff", { body })`. The body is
 * exactly one of the request types below. Extra fields are refused.
 */

export const CLOUD_BFF_FUNCTION = "cloud-bff" as const;

export const CLOUD_BFF_ACTIONS = [
  "compatibility",
  "bootstrap",
  "listWorkspaces",
  "selectWorkspace",
  "listEngines",
  "engineOverview",
] as const;

export type CloudBffAction = (typeof CLOUD_BFF_ACTIONS)[number];

/** One Control endpoint per Hub action. Not a general proxy. */
export const CLOUD_BFF_CONTROL_ENDPOINTS = {
  compatibility: { method: "GET", path: "/api/cloud/compatibility" },
  bootstrap: { method: "POST", path: "/api/cloud/bootstrap" },
  listWorkspaces: { method: "GET", path: "/api/me/workspaces" },
  // Control has no dedicated select route; membership is confirmed via the list.
  selectWorkspace: { method: "GET", path: "/api/me/workspaces" },
  listEngines: { method: "GET", path: "/api/workspaces/{workspaceId}/instances" },
  engineOverview: {
    method: "GET",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/overview",
  },
} as const;

export const CLOUD_REQUIRED_CAPABILITIES = [
  "cloud.bootstrap.v1",
  "hosted.instances.list.v1",
  "hosted.instances.status.v1",
  "hosted.instances.overview.v1",
] as const;

export const CLOUD_SUPPORTED_CONTRACT_VERSION = 1;

export const CLOUD_UPDATING_CODE = "control_update_in_progress" as const;

export const CLOUD_UPDATING_MESSAGE =
  "Elsa Cloud is being updated. Managed engine actions are temporarily paused.";

export type CompatibilityRequest = { action: "compatibility" };
export type BootstrapRequest = { action: "bootstrap" };
export type ListWorkspacesRequest = { action: "listWorkspaces" };
export type SelectWorkspaceRequest = { action: "selectWorkspace"; workspaceId: string };
export type ListEnginesRequest = { action: "listEngines"; workspaceId: string };
export type EngineOverviewRequest = {
  action: "engineOverview";
  workspaceId: string;
  engineId: string;
};

export type CloudBffRequest =
  | CompatibilityRequest
  | BootstrapRequest
  | ListWorkspacesRequest
  | SelectWorkspaceRequest
  | ListEnginesRequest
  | EngineOverviewRequest;

export type CloudUpdatingState = {
  ok: false;
  state: "updating";
  code: typeof CLOUD_UPDATING_CODE;
  error: typeof CLOUD_UPDATING_MESSAGE;
};

export type CloudBffErrorCode =
  | "unauthorized"
  | "unknown_action"
  | "unexpected_fields"
  | "invalid_request"
  | "forbidden"
  | "not_found";

export type CloudBffClientError = {
  ok: false;
  code: CloudBffErrorCode;
  error: string;
};

export type CloudWorkspace = {
  id: string;
  name: string;
  kind: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationRole: string;
};

export type CloudEngineSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  release: string | null;
};

export type CloudEngineOverview = CloudEngineSummary & {
  health: string;
  canOpen: boolean;
};

export type CompatibilityResponse = {
  ok: true;
  state: "compatible";
  contractVersion: typeof CLOUD_SUPPORTED_CONTRACT_VERSION;
  capabilities: string[];
};

export type BootstrapResponse = {
  ok: true;
  state: "ready";
  organizationId: string;
  workspaceId: string;
};

export type ListWorkspacesResponse = {
  ok: true;
  state: "ready";
  workspaces: CloudWorkspace[];
};

export type SelectWorkspaceResponse = {
  ok: true;
  state: "ready";
  workspace: CloudWorkspace;
};

export type ListEnginesResponse = {
  ok: true;
  state: "ready" | "empty";
  workspaceId: string;
  engines: CloudEngineSummary[];
};

export type EngineOverviewResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  engine: CloudEngineOverview;
};

export type CloudBffSuccessResponse =
  | CompatibilityResponse
  | BootstrapResponse
  | ListWorkspacesResponse
  | SelectWorkspaceResponse
  | ListEnginesResponse
  | EngineOverviewResponse;

export type CloudBffResponse =
  | CloudBffSuccessResponse
  | CloudUpdatingState
  | CloudBffClientError;

export function isCloudUpdating(
  response: CloudBffResponse,
): response is CloudUpdatingState {
  return response.ok === false && "state" in response && response.state === "updating";
}

export function isCloudBffError(
  response: CloudBffResponse,
): response is CloudBffClientError {
  return response.ok === false && !("state" in response);
}
