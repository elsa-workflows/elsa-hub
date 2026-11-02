import { accountLinkFailure, normalizeAccountLink } from "./cloud-account-link.ts";
import {
  defaultCloudCompatibilityCache,
  isCloudWriteAction,
  writeActionsAllowed,
  type CompatibilityCache,
} from "./cloud-compatibility.ts";
import { jsonResponse } from "./cloud-http.ts";
import type { ControlCall, ControlFetch, ControlResult } from "./cloud-control.ts";
import {
  isCompatibleControl,
  normalizeActivity,
  normalizeAcceptedCreate,
  normalizeAvailableReleases,
  normalizeBootstrap,
  normalizeCompatibility,
  normalizeDeleteConfirmation,
  normalizeEngineOverview,
  normalizeEngines,
  normalizeOnboardingOptions,
  normalizeOperation,
  normalizeProvisioningProgress,
  normalizeStudioHandoff,
  normalizeWorkspaces,
} from "./cloud-control.ts";
import {
  persistLinkFromValidatedBootstrap,
  type OrgAdminClient,
  type PersistControlOrganizationLinkResult,
} from "./cloud-organization-link.ts";
import {
  allowedFieldsFor,
  isCloudBffAction,
  isGuid,
  isNonEmptyString,
  limitBody,
  updatingBody,
  CLOUD_ORG_LINK_CONFLICT,
  CLOUD_ORG_LINK_CONFLICT_CODE,
  CLOUD_ORG_LINK_FORBIDDEN,
  type CloudBffAction,
  type CloudBffRequest,
} from "./cloud-types.ts";

export type PersistValidatedBootstrapLink = typeof persistLinkFromValidatedBootstrap;

export type CloudActionContext = {
  accessToken: string;
  controlFetch: ControlFetch;
  userClient?: OrgAdminClient;
  serviceClient?: unknown;
  persistLink?: PersistValidatedBootstrapLink;
  compatibilityCache?: CompatibilityCache;
};

type ParsedRequest =
  | { ok: true; request: CloudBffRequest }
  | { ok: false; status: number; body: unknown };

const WORKSPACE_ACTIONS: CloudBffAction[] = [
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
];

const ENGINE_ACTIONS: CloudBffAction[] = [
  "engineOverview",
  "provisioningProgress",
  "engineActivity",
  "availableReleases",
  "restartEngine",
  "applyRelease",
  "confirmDelete",
  "deleteEngine",
  "deleteOperationStatus",
  "issueStudioHandoff",
];

export function parseCloudBffRequest(payload: unknown): ParsedRequest {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "invalid_request", error: "Body must be a JSON object." },
    };
  }

  const record = payload as Record<string, unknown>;
  const action = record.action;
  if (!isCloudBffAction(action)) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "unknown_action", error: "Unknown action." },
    };
  }

  const allowed = new Set(allowedFieldsFor(action));
  const extra = Object.keys(record).filter((key) => !allowed.has(key));
  if (extra.length > 0) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "unexpected_fields", error: "Unexpected fields." },
    };
  }

  if (WORKSPACE_ACTIONS.includes(action) && !isGuid(record.workspaceId)) {
    return invalid("A workspace id is required.");
  }
  if (ENGINE_ACTIONS.includes(action) && !isGuid(record.engineId)) {
    return invalid("An engine id is required.");
  }
  if (action === "createEngine") {
    if (!isNonEmptyString(record.name) || !isNonEmptyString(record.slug)) {
      return invalid("An engine name and slug are required.");
    }
    if (record.intent === null || typeof record.intent !== "object" || Array.isArray(record.intent)) {
      return invalid("A create intent is required.");
    }
    if (!isGuid(record.idempotencyKey)) {
      return invalid("An idempotency key is required.");
    }
  }
  if ((action === "restartEngine" || action === "applyRelease" || action === "deleteEngine")) {
    if (!isGuid(record.idempotencyKey)) {
      return invalid("An idempotency key is required.");
    }
    if (!isNonEmptyString(record.ifMatch)) {
      return invalid("An If-Match value is required.");
    }
  }
  if (action === "applyRelease" && !isNonEmptyString(record.version)) {
    return invalid("A release version is required.");
  }
  if (action === "deleteEngine" && !isGuid(record.deleteConfirmationId)) {
    return invalid("A delete confirmation id is required.");
  }
  if (action === "deleteOperationStatus" && !isGuid(record.operationId)) {
    return invalid("An operation id is required.");
  }
  if (action === "bootstrap" && record.hubOrganizationId !== undefined && !isGuid(record.hubOrganizationId)) {
    return invalid("A Hub organization id is required.");
  }
  if (action === "linkCloudAccount" && !isNonEmptyString(record.cloudAccessToken)) {
    return invalid("An Elsa Cloud access token is required.");
  }
  if (action === "issueStudioHandoff") {
    if (!isGuid(record.organizationId)) {
      return invalid("An organization id is required.");
    }
    if (
      !isNonEmptyString(record.audience) ||
      !isNonEmptyString(record.redirectUri) ||
      !isNonEmptyString(record.codeChallenge)
    ) {
      return invalid("A Studio handoff audience, redirect URI and code challenge are required.");
    }
  }

  return { ok: true, request: record as CloudBffRequest };
}

function invalid(error: string): ParsedRequest {
  return {
    ok: false,
    status: 400,
    body: { ok: false, code: "invalid_request", error },
  };
}

function persistLinkFailure(
  persisted: Extract<PersistControlOrganizationLinkResult, { ok: false }>,
): Response {
  if (persisted.code === "conflict") {
    return jsonResponse(409, {
      ok: false,
      code: CLOUD_ORG_LINK_CONFLICT_CODE,
      error: CLOUD_ORG_LINK_CONFLICT,
    });
  }
  if (persisted.code === "forbidden") {
    return jsonResponse(403, {
      ok: false,
      code: "forbidden",
      error: CLOUD_ORG_LINK_FORBIDDEN,
    });
  }
  if (persisted.code === "invalid_request") {
    return jsonResponse(400, {
      ok: false,
      code: "invalid_request",
      error: "The request could not be completed.",
    });
  }
  return jsonResponse(503, updatingBody());
}

function failedControl(result: Extract<ControlResult, { ok: false }>): Response {
  if (result.kind === "limit") {
    return jsonResponse(422, limitBody(result.currentInstances, result.maxInstances));
  }
  if (result.kind === "forbidden") {
    return jsonResponse(403, {
      ok: false,
      code: "forbidden",
      error: "This workspace is not available.",
    });
  }
  if (result.kind === "not_found") {
    return jsonResponse(404, {
      ok: false,
      code: "not_found",
      error: "This engine is not available.",
    });
  }
  if (result.kind === "invalid") {
    return jsonResponse(400, {
      ok: false,
      code: "invalid_request",
      error: "The request could not be completed.",
    });
  }
  return jsonResponse(503, updatingBody());
}

function instancePath(request: CloudBffRequest, suffix = "") {
  return `/api/workspaces/${request.workspaceId}/instances/${request.engineId}${suffix}`;
}

function mutationHeaders(request: CloudBffRequest): Record<string, string> {
  return {
    ...(request.idempotencyKey ? { "Idempotency-Key": request.idempotencyKey } : {}),
    ...(request.ifMatch ? { "If-Match": request.ifMatch } : {}),
  };
}

async function callControl(
  ctx: CloudActionContext,
  action: CloudBffAction,
  request: CloudBffRequest,
): Promise<ControlResult> {
  const call = (next: ControlCall) => ctx.controlFetch({ ...next, action }, ctx.accessToken);

  switch (action) {
    case "compatibility":
      return await call({ method: "GET", path: "/api/cloud/compatibility" });
    case "bootstrap":
      return await call({ method: "POST", path: "/api/cloud/bootstrap", body: {} });
    case "listWorkspaces":
    case "selectWorkspace":
      return await call({ method: "GET", path: "/api/me/workspace-memberships" });
    case "listEngines":
      return await call({
        method: "GET",
        path: `/api/workspaces/${request.workspaceId}/instances`,
      });
    case "engineOverview":
      return await call({ method: "GET", path: instancePath(request, "/overview") });
    case "onboardingOptions":
      return await call({
        method: "GET",
        path: `/api/workspaces/${request.workspaceId}/instances/onboarding-options`,
      });
    case "createEngine":
      return await call({
        method: "POST",
        path: `/api/workspaces/${request.workspaceId}/instances`,
        headers: mutationHeaders(request),
        body: { name: request.name, slug: request.slug, intent: request.intent },
      });
    case "provisioningProgress":
      return await call({ method: "GET", path: instancePath(request, "/provisioning-progress") });
    case "engineActivity":
      return await call({ method: "GET", path: instancePath(request, "/activity") });
    case "availableReleases":
      return await call({ method: "GET", path: instancePath(request, "/available-releases") });
    case "restartEngine":
      return await call({
        method: "POST",
        path: instancePath(request, "/restart"),
        headers: mutationHeaders(request),
      });
    case "applyRelease":
      return await call({
        method: "POST",
        path: instancePath(request, "/apply-release"),
        headers: mutationHeaders(request),
        body: { version: request.version },
      });
    case "confirmDelete":
      return await call({
        method: "POST",
        path: instancePath(request, "/delete-confirmations"),
      });
    case "deleteEngine":
      return await call({
        method: "POST",
        path: instancePath(request, "/delete"),
        headers: mutationHeaders(request),
        body: { deleteConfirmationId: request.deleteConfirmationId },
      });
    case "deleteOperationStatus":
      return await call({
        method: "GET",
        path: instancePath(request, `/delete-operations/${request.operationId}`),
      });
    case "issueStudioHandoff":
      return await call({
        method: "POST",
        path: "/api/managed-elsa/handoff/issue",
        body: {
          organizationId: request.organizationId,
          instanceId: request.engineId,
          audience: request.audience,
          redirectUri: request.redirectUri,
          codeChallenge: request.codeChallenge,
        },
      });
    case "linkCloudAccount":
      return await call({
        method: "POST",
        path: "/api/cloud/account-links",
        headers: {
          "X-Elsa-Hub-Authorization": `Bearer ${ctx.accessToken}`,
          "X-Elsa-Cloud-Authorization": `Bearer ${request.cloudAccessToken}`,
        },
        body: {},
      });
  }
}

export async function dispatchCloudAction(
  ctx: CloudActionContext,
  request: CloudBffRequest,
): Promise<Response> {
  if (isCloudWriteAction(request.action)) {
    const allowed = await writeActionsAllowed(
      ctx.controlFetch,
      ctx.accessToken,
      ctx.compatibilityCache ?? defaultCloudCompatibilityCache(),
    );
    if (!allowed) return jsonResponse(503, updatingBody());
  }

  const result = await callControl(ctx, request.action, request);
  if (!result.ok) {
    if (request.action === "linkCloudAccount") return accountLinkFailure(result);
    return failedControl(result);
  }

  switch (request.action) {
    case "compatibility": {
      if (!isCompatibleControl(result.body)) {
        return jsonResponse(503, updatingBody());
      }
      const normalized = normalizeCompatibility(result.body)!;
      return jsonResponse(200, {
        ok: true,
        state: "compatible",
        contractVersion: normalized.contractVersion,
        capabilities: normalized.capabilities,
      });
    }
    case "bootstrap": {
      const normalized = normalizeBootstrap(result.body);
      if (!normalized) return jsonResponse(503, updatingBody());
      if (request.hubOrganizationId) {
        const persist = ctx.persistLink ?? persistLinkFromValidatedBootstrap;
        if (!ctx.userClient || !ctx.serviceClient) {
          return jsonResponse(503, updatingBody());
        }
        const persisted = await persist({
          userClient: ctx.userClient,
          serviceClient: ctx.serviceClient,
          hubOrganizationId: request.hubOrganizationId,
          bootstrap: normalized,
        });
        if (!persisted.ok) return persistLinkFailure(persisted);
      }
      return jsonResponse(200, { ok: true, state: "ready", ...normalized });
    }
    case "listWorkspaces": {
      const workspaces = normalizeWorkspaces(result.body);
      if (!workspaces) return jsonResponse(503, updatingBody());
      return jsonResponse(200, { ok: true, state: "ready", workspaces });
    }
    case "selectWorkspace": {
      const workspaces = normalizeWorkspaces(result.body);
      if (!workspaces) return jsonResponse(503, updatingBody());
      const workspace = workspaces.find((item) => item.id === request.workspaceId);
      if (!workspace) {
        return jsonResponse(403, {
          ok: false,
          code: "forbidden",
          error: "This workspace is not available.",
        });
      }
      return jsonResponse(200, { ok: true, state: "ready", workspace });
    }
    case "listEngines": {
      const engines = normalizeEngines(result.body);
      if (!engines) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: engines.length === 0 ? "empty" : "ready",
        workspaceId: request.workspaceId,
        engines,
      });
    }
    case "engineOverview": {
      const engine = normalizeEngineOverview(result.body, result.etag);
      if (!engine) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engine,
      });
    }
    case "onboardingOptions": {
      const options = normalizeOnboardingOptions(result.body);
      if (!options) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        options,
      });
    }
    case "createEngine": {
      const accepted = normalizeAcceptedCreate(result.body);
      if (!accepted) return jsonResponse(503, updatingBody());
      return jsonResponse(202, {
        ok: true,
        state: "accepted",
        workspaceId: request.workspaceId,
        engine: accepted.engine,
        operation: accepted.operation,
      });
    }
    case "provisioningProgress": {
      const progress = normalizeProvisioningProgress(result.body);
      if (!progress) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engineId: request.engineId,
        progress,
      });
    }
    case "engineActivity": {
      const activity = normalizeActivity(result.body);
      if (!activity) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engineId: request.engineId,
        ...activity,
      });
    }
    case "availableReleases": {
      const releases = normalizeAvailableReleases(result.body);
      if (!releases) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engineId: request.engineId,
        releases,
      });
    }
    case "restartEngine":
    case "applyRelease":
    case "deleteEngine": {
      const operation = normalizeOperation(result.body) ??
        normalizeAcceptedCreate(result.body)?.operation ??
        null;
      if (!operation) return jsonResponse(503, updatingBody());
      return jsonResponse(202, {
        ok: true,
        state: "accepted",
        workspaceId: request.workspaceId,
        engineId: request.engineId,
        operation,
      });
    }
    case "confirmDelete": {
      const confirmation = normalizeDeleteConfirmation(result.body);
      if (!confirmation) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engineId: request.engineId,
        confirmation,
      });
    }
    case "deleteOperationStatus": {
      const operation = normalizeOperation(result.body);
      if (!operation) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engineId: request.engineId,
        operation,
      });
    }
    case "issueStudioHandoff": {
      const handoff = normalizeStudioHandoff(result.body);
      if (!handoff) return jsonResponse(503, updatingBody());
      return jsonResponse(200, { ok: true, state: "ready", handoff });
    }
    case "linkCloudAccount": {
      const linked = normalizeAccountLink(result.body);
      if (!linked) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: linked.alreadyLinked ? "already_linked" : "linked",
        accountId: linked.accountId,
      });
    }
  }
}
