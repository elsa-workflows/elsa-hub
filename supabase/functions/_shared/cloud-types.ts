/**
 * Deno copy of the Hub cloud-bff action contract.
 * Keep this file aligned with `src/lib/cloud/actions.ts` (the #45 import).
 */

export const CLOUD_BFF_ACTIONS = [
  "compatibility",
  "bootstrap",
  "listWorkspaces",
  "selectWorkspace",
  "listEngines",
  "engineOverview",
] as const;

export type CloudBffAction = (typeof CLOUD_BFF_ACTIONS)[number];

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

const ACTION_FIELDS: Record<CloudBffAction, readonly string[]> = {
  compatibility: ["action"],
  bootstrap: ["action"],
  listWorkspaces: ["action"],
  selectWorkspace: ["action", "workspaceId"],
  listEngines: ["action", "workspaceId"],
  engineOverview: ["action", "workspaceId", "engineId"],
};

export type CloudBffRequest = {
  action: CloudBffAction;
  workspaceId?: string;
  engineId?: string;
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

export type CloudUpdatingBody = {
  ok: false;
  state: "updating";
  code: typeof CLOUD_UPDATING_CODE;
  error: typeof CLOUD_UPDATING_MESSAGE;
};

export type CloudClientErrorBody = {
  ok: false;
  code:
    | "unauthorized"
    | "unknown_action"
    | "unexpected_fields"
    | "invalid_request"
    | "forbidden"
    | "not_found";
  error: string;
};

export function isCloudBffAction(value: unknown): value is CloudBffAction {
  return typeof value === "string" &&
    (CLOUD_BFF_ACTIONS as readonly string[]).includes(value);
}

export function allowedFieldsFor(action: CloudBffAction): readonly string[] {
  return ACTION_FIELDS[action];
}

export function updatingBody(): CloudUpdatingBody {
  return {
    ok: false,
    state: "updating",
    code: CLOUD_UPDATING_CODE,
    error: CLOUD_UPDATING_MESSAGE,
  };
}

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGuid(value: unknown): value is string {
  return typeof value === "string" && GUID.test(value);
}
