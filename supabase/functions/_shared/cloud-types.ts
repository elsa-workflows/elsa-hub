/**
 * Deno copy of the Hub cloud-bff action contract.
 * Keep this file aligned with `src/lib/cloud/actions.ts`.
 */

export const CLOUD_BFF_ACTIONS = [
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
  "linkCloudAccount",
] as const;

export type CloudBffAction = (typeof CLOUD_BFF_ACTIONS)[number];

export const CLOUD_REQUIRED_READ_CAPABILITIES = [
  "cloud.bootstrap.v1",
  "hosted.instances.list.v1",
  "hosted.instances.status.v1",
  "hosted.instances.provisioning-progress.v1",
  "hosted.instances.overview.v1",
  "hosted.instances.quota-problem.v1",
] as const;

export const CLOUD_REQUIRED_WRITE_CAPABILITIES = [
  "hosted.instances.create.v1",
  "hosted.studio.handoff.issue.v1",
  "hosted.instances.confirmed-delete.v1",
] as const;

export const CLOUD_REQUIRED_CAPABILITIES = [
  ...CLOUD_REQUIRED_READ_CAPABILITIES,
  ...CLOUD_REQUIRED_WRITE_CAPABILITIES,
] as const;

export const CLOUD_WRITE_ACTIONS = [
  "createEngine",
  "restartEngine",
  "applyRelease",
  "confirmDelete",
  "deleteEngine",
  "issueStudioHandoff",
  "linkCloudAccount",
] as const;

export const CLOUD_SUPPORTED_CONTRACT_VERSION = 1;

export const CLOUD_UPDATING_CODE = "control_update_in_progress" as const;

export const CLOUD_UPDATING_MESSAGE =
  "Elsa Cloud is being updated. Managed engine actions are temporarily paused.";

export const CLOUD_LIMIT_CODE = "instance_limit_reached" as const;

export const CLOUD_LIMIT_MESSAGE = "You've reached the engine limit for your plan.";

export const CLOUD_ORG_LINK_CONFLICT_CODE = "conflict" as const;

export const CLOUD_ORG_LINK_CONFLICT =
  "This organization is already linked to a different Elsa Cloud account. That link cannot be changed here.";

export const CLOUD_ORG_LINK_FORBIDDEN =
  "Only an organization admin can set up Elsa Cloud for this organization.";

export const CLOUD_ACCOUNT_LINK_SESSIONS_CODE = "sessions_required" as const;
export const CLOUD_ACCOUNT_LINK_REAUTH_CODE = "reauthentication_required" as const;
export const CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE = "cloud_account_missing" as const;
export const CLOUD_ACCOUNT_LINK_CONFLICT_CODE = "account_already_linked" as const;
export const CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE = "hub_account_has_engines" as const;
export const CLOUD_ACCOUNT_LINK_HAS_STATE_CODE = "hub_account_has_state" as const;

export const CLOUD_ACCOUNT_LINK_ALREADY =
  "This Hub account is already linked to this Elsa Cloud account.";
export const CLOUD_ACCOUNT_LINK_SESSIONS =
  "Sign in to Elsa Cloud and the Hub to link them.";
export const CLOUD_ACCOUNT_LINK_REAUTH = "Sign in again to continue linking.";
export const CLOUD_ACCOUNT_LINK_CLOUD_MISSING =
  "That Elsa Cloud sign-in is not connected to an existing Cloud account.";
export const CLOUD_ACCOUNT_LINK_CONFLICT =
  "This Elsa Cloud account is already linked to a different Hub account.";
export const CLOUD_ACCOUNT_LINK_HAS_ENGINES =
  "This Hub account already has its own Elsa Cloud engines.";
export const CLOUD_ACCOUNT_LINK_HAS_STATE =
  "This Hub account already has Elsa Cloud organization or subscription state.";

export type CloudAccountLinkStaleSession = "hub" | "cloud" | "both";

const ACTION_FIELDS: Record<CloudBffAction, readonly string[]> = {
  compatibility: ["action"],
  bootstrap: ["action", "hubOrganizationId"],
  listWorkspaces: ["action"],
  selectWorkspace: ["action", "workspaceId"],
  listEngines: ["action", "workspaceId"],
  engineOverview: ["action", "workspaceId", "engineId"],
  onboardingOptions: ["action", "workspaceId"],
  createEngine: ["action", "workspaceId", "name", "slug", "intent", "idempotencyKey"],
  provisioningProgress: ["action", "workspaceId", "engineId"],
  engineActivity: ["action", "workspaceId", "engineId"],
  availableReleases: ["action", "workspaceId", "engineId"],
  restartEngine: ["action", "workspaceId", "engineId", "idempotencyKey", "ifMatch"],
  applyRelease: ["action", "workspaceId", "engineId", "version", "idempotencyKey", "ifMatch"],
  confirmDelete: ["action", "workspaceId", "engineId"],
  deleteEngine: [
    "action",
    "workspaceId",
    "engineId",
    "deleteConfirmationId",
    "idempotencyKey",
    "ifMatch",
  ],
  deleteOperationStatus: ["action", "workspaceId", "engineId", "operationId"],
  issueStudioHandoff: [
    "action",
    "organizationId",
    "engineId",
    "audience",
    "redirectUri",
    "codeChallenge",
  ],
  linkCloudAccount: ["action", "cloudAccessToken"],
};

export type CloudBffRequest = {
  action: CloudBffAction;
  workspaceId?: string;
  engineId?: string;
  organizationId?: string;
  hubOrganizationId?: string;
  name?: string;
  slug?: string;
  intent?: unknown;
  idempotencyKey?: string;
  ifMatch?: string;
  version?: string;
  deleteConfirmationId?: string;
  operationId?: string;
  audience?: string;
  redirectUri?: string;
  codeChallenge?: string;
  cloudAccessToken?: string;
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

export type CloudEngineActionDecision = {
  allowed: boolean;
  reasonCode: string | null;
};

export type CloudEngineOverview = CloudEngineSummary & {
  health: string;
  canOpen: boolean;
  version: number | null;
  etag: string | null;
  organizationId: string | null;
  audience: string | null;
  redirectUri: string | null;
  allowedActions: {
    restart: CloudEngineActionDecision;
    applyRelease: CloudEngineActionDecision;
    open: CloudEngineActionDecision;
    delete: CloudEngineActionDecision;
  };
};

export type CloudReleaseOption = {
  distributionId: string;
  releaseLine: string;
  version: string;
  channel: string;
  topologyId: string;
  previewManifestDigest?: string | null;
};

export type CloudLaunchProfile = {
  name: string;
  description: string;
  targetMode: string;
  regionCode: string;
  isolationProfile: string;
  capacityProfile: string;
  networkOutcome: string;
  domainOutcome: string;
};

export type CloudOnboardingOptions = {
  releases: CloudReleaseOption[];
  previewReleases: CloudReleaseOption[];
  launchProfile: CloudLaunchProfile;
};

export type CloudProvisioningStage = {
  code: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type CloudProvisioningProgress = {
  state: string;
  currentStage: string | null;
  startedAt: string | null;
  lastUpdatedAt: string | null;
  completedAt: string | null;
  diagnosticCode: string | null;
  stages: CloudProvisioningStage[];
};

export type CloudActivityItem = {
  sequence: number;
  eventType: string;
  occurredAt: string;
  action: string | null;
  diagnosticCode: string | null;
  severity: string;
  message: string | null;
};

export type CloudAvailableRelease = {
  releaseLine: string;
  version: string;
  channel: string;
  changeKind: string;
};

export type CloudOperation = {
  id: string;
  action: string;
  state: string;
};

export type CloudDeleteConfirmation = {
  id: string;
  expiresAt: string;
  billingNotice: { code: string; message: string } | null;
};

export type CloudStudioHandoff = {
  token: string;
  tokenType: string;
  audience: string;
  redirectUri: string;
  issuedAt: string;
  expiresAt: string;
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
    | "not_found"
    | typeof CLOUD_LIMIT_CODE
    | typeof CLOUD_ORG_LINK_CONFLICT_CODE
    | typeof CLOUD_ACCOUNT_LINK_SESSIONS_CODE
    | typeof CLOUD_ACCOUNT_LINK_REAUTH_CODE
    | typeof CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE
    | typeof CLOUD_ACCOUNT_LINK_CONFLICT_CODE
    | typeof CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE
    | typeof CLOUD_ACCOUNT_LINK_HAS_STATE_CODE;
  error: string;
  currentInstances?: number;
  maxInstances?: number;
  staleSession?: CloudAccountLinkStaleSession;
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

export function limitBody(
  currentInstances?: number,
  maxInstances?: number,
): CloudClientErrorBody {
  return {
    ok: false,
    code: CLOUD_LIMIT_CODE,
    error: CLOUD_LIMIT_MESSAGE,
    ...(typeof currentInstances === "number" ? { currentInstances } : {}),
    ...(typeof maxInstances === "number" ? { maxInstances } : {}),
  };
}

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGuid(value: unknown): value is string {
  return typeof value === "string" && GUID.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export const CLOUD_TERMINAL_OPERATION_STATES = [
  "Succeeded",
  "Failed",
  "Cancelled",
  "RecoveryRequired",
] as const;
