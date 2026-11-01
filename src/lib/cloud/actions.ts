/**
 * cloud-bff action contract for the Hub dashboard Cloud console.
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
  onboardingOptions: {
    method: "GET",
    path: "/api/workspaces/{workspaceId}/instances/onboarding-options",
  },
  createEngine: { method: "POST", path: "/api/workspaces/{workspaceId}/instances" },
  provisioningProgress: {
    method: "GET",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/provisioning-progress",
  },
  engineActivity: {
    method: "GET",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/activity",
  },
  availableReleases: {
    method: "GET",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/available-releases",
  },
  restartEngine: {
    method: "POST",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/restart",
  },
  applyRelease: {
    method: "POST",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/apply-release",
  },
  confirmDelete: {
    method: "POST",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/delete-confirmations",
  },
  deleteEngine: {
    method: "POST",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/delete",
  },
  deleteOperationStatus: {
    method: "GET",
    path: "/api/workspaces/{workspaceId}/instances/{engineId}/delete-operations/{operationId}",
  },
  issueStudioHandoff: { method: "POST", path: "/api/managed-elsa/handoff/issue" },
  linkCloudAccount: { method: "POST", path: "/api/cloud/account-links" },
} as const;

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

export type CompatibilityRequest = { action: "compatibility" };
export type BootstrapRequest = { action: "bootstrap"; hubOrganizationId?: string };
export type ListWorkspacesRequest = { action: "listWorkspaces" };
export type SelectWorkspaceRequest = { action: "selectWorkspace"; workspaceId: string };
export type ListEnginesRequest = { action: "listEngines"; workspaceId: string };
export type EngineOverviewRequest = {
  action: "engineOverview";
  workspaceId: string;
  engineId: string;
};
export type OnboardingOptionsRequest = { action: "onboardingOptions"; workspaceId: string };
export type CreateEngineRequest = {
  action: "createEngine";
  workspaceId: string;
  name: string;
  slug: string;
  intent: CloudEngineCreateIntent;
  idempotencyKey: string;
};
export type ProvisioningProgressRequest = {
  action: "provisioningProgress";
  workspaceId: string;
  engineId: string;
};
export type EngineActivityRequest = {
  action: "engineActivity";
  workspaceId: string;
  engineId: string;
};
export type AvailableReleasesRequest = {
  action: "availableReleases";
  workspaceId: string;
  engineId: string;
};
export type RestartEngineRequest = {
  action: "restartEngine";
  workspaceId: string;
  engineId: string;
  idempotencyKey: string;
  ifMatch: string;
};
export type ApplyReleaseRequest = {
  action: "applyRelease";
  workspaceId: string;
  engineId: string;
  version: string;
  idempotencyKey: string;
  ifMatch: string;
};
export type ConfirmDeleteRequest = {
  action: "confirmDelete";
  workspaceId: string;
  engineId: string;
};
export type DeleteEngineRequest = {
  action: "deleteEngine";
  workspaceId: string;
  engineId: string;
  deleteConfirmationId: string;
  idempotencyKey: string;
  ifMatch: string;
};
export type DeleteOperationStatusRequest = {
  action: "deleteOperationStatus";
  workspaceId: string;
  engineId: string;
  operationId: string;
};
export type IssueStudioHandoffRequest = {
  action: "issueStudioHandoff";
  organizationId: string;
  engineId: string;
  audience: string;
  redirectUri: string;
  codeChallenge: string;
};
export type LinkCloudAccountRequest = {
  action: "linkCloudAccount";
  cloudAccessToken: string;
};

export type CloudBffRequest =
  | CompatibilityRequest
  | BootstrapRequest
  | ListWorkspacesRequest
  | SelectWorkspaceRequest
  | ListEnginesRequest
  | EngineOverviewRequest
  | OnboardingOptionsRequest
  | CreateEngineRequest
  | ProvisioningProgressRequest
  | EngineActivityRequest
  | AvailableReleasesRequest
  | RestartEngineRequest
  | ApplyReleaseRequest
  | ConfirmDeleteRequest
  | DeleteEngineRequest
  | DeleteOperationStatusRequest
  | IssueStudioHandoffRequest
  | LinkCloudAccountRequest;

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
  | "not_found"
  | typeof CLOUD_LIMIT_CODE
  | typeof CLOUD_ORG_LINK_CONFLICT_CODE
  | typeof CLOUD_ACCOUNT_LINK_SESSIONS_CODE
  | typeof CLOUD_ACCOUNT_LINK_REAUTH_CODE
  | typeof CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE
  | typeof CLOUD_ACCOUNT_LINK_CONFLICT_CODE
  | typeof CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE
  | typeof CLOUD_ACCOUNT_LINK_HAS_STATE_CODE;

export type CloudBffClientError = {
  ok: false;
  code: CloudBffErrorCode;
  error: string;
  currentInstances?: number;
  maxInstances?: number;
  staleSession?: CloudAccountLinkStaleSession;
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

export type CloudLastOperation = {
  action: string;
  state: string;
  completedAt: string | null;
  failureCode: string | null;
};

export type CloudOperationProgress = {
  phase: string | null;
  attemptedStep: string | null;
  attemptNumber: number | null;
  attemptStartedAt: string | null;
};

export type CloudEngineOverview = CloudEngineSummary & {
  health: string;
  canOpen: boolean;
  version: number | null;
  etag: string | null;
  organizationId: string | null;
  audience: string | null;
  redirectUri: string | null;
  unavailableReason?: string | null;
  unavailableReasonCode?: string | null;
  activeOperation?: CloudOperation | null;
  lastOperation?: CloudLastOperation | null;
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

export type CloudEngineCreateIntent = {
  release: {
    distributionId: string;
    releaseLine: string;
    requestedVersion: string;
    channel: string;
    patchUpdates: string;
    minorUpdates: string;
    majorMigrations: string;
    previewManifestDigest?: string;
  };
  application: {
    topologyId: string;
    featurePresetId: string | null;
    featureOverrides: Record<string, unknown>;
    packagePolicy: string | null;
    configurationShapeRevisionId: string | null;
  };
  placement: {
    targetMode: string;
    regionCode: string;
    isolationProfile: string;
    capacityProfile: string;
    networkOutcome: string;
    domainOutcome: string;
  };
  desiredLifecycle: "Running";
};

export type CloudProvisioningStage = {
  code: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type CloudProvisioningActivity = {
  sequence: number;
  messageCode: string | null;
};

export type CloudProvisioningProgress = {
  state: string;
  currentStage: string | null;
  startedAt: string | null;
  lastUpdatedAt: string | null;
  completedAt: string | null;
  diagnosticCode: string | null;
  phase?: string | null;
  attemptedStep?: string | null;
  attemptNumber?: number | null;
  attemptStartedAt?: string | null;
  stages: CloudProvisioningStage[];
  activity?: CloudProvisioningActivity[];
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
  acceptedAt?: string | null;
  startedAt?: string | null;
  requiresHumanAt?: string | null;
  progress?: CloudOperationProgress | null;
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

export type OnboardingOptionsResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  options: CloudOnboardingOptions;
};

export type CreateEngineResponse = {
  ok: true;
  state: "accepted";
  workspaceId: string;
  engine: CloudEngineSummary;
  operation: CloudOperation;
};

export type ProvisioningProgressResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  engineId: string;
  progress: CloudProvisioningProgress;
};

export type EngineActivityResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  engineId: string;
  items: CloudActivityItem[];
  hasMore: boolean;
};

export type AvailableReleasesResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  engineId: string;
  releases: CloudAvailableRelease[];
};

export type RestartEngineResponse = {
  ok: true;
  state: "accepted";
  workspaceId: string;
  engineId: string;
  operation: CloudOperation;
};

export type ApplyReleaseResponse = {
  ok: true;
  state: "accepted";
  workspaceId: string;
  engineId: string;
  operation: CloudOperation;
};

export type ConfirmDeleteResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  engineId: string;
  confirmation: CloudDeleteConfirmation;
};

export type DeleteEngineResponse = {
  ok: true;
  state: "accepted";
  workspaceId: string;
  engineId: string;
  operation: CloudOperation;
};

export type DeleteOperationStatusResponse = {
  ok: true;
  state: "ready";
  workspaceId: string;
  engineId: string;
  operation: CloudOperation;
};

export type IssueStudioHandoffResponse = {
  ok: true;
  state: "ready";
  handoff: CloudStudioHandoff;
};

export type LinkCloudAccountResponse = {
  ok: true;
  state: "linked" | "already_linked";
  accountId: string;
};

export type CloudBffSuccessResponse =
  | CompatibilityResponse
  | BootstrapResponse
  | ListWorkspacesResponse
  | SelectWorkspaceResponse
  | ListEnginesResponse
  | EngineOverviewResponse
  | OnboardingOptionsResponse
  | CreateEngineResponse
  | ProvisioningProgressResponse
  | EngineActivityResponse
  | AvailableReleasesResponse
  | RestartEngineResponse
  | ApplyReleaseResponse
  | ConfirmDeleteResponse
  | DeleteEngineResponse
  | DeleteOperationStatusResponse
  | IssueStudioHandoffResponse
  | LinkCloudAccountResponse;

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

export function isCloudLimitReached(
  response: CloudBffResponse,
): response is CloudBffClientError & { code: typeof CLOUD_LIMIT_CODE } {
  return isCloudBffError(response) && response.code === CLOUD_LIMIT_CODE;
}

export const CLOUD_TERMINAL_OPERATION_STATES = [
  "Succeeded",
  "Failed",
  "Cancelled",
  "RecoveryRequired",
] as const;

export function isCloudTerminalOperationState(state: string): boolean {
  return (CLOUD_TERMINAL_OPERATION_STATES as readonly string[]).includes(state);
}
