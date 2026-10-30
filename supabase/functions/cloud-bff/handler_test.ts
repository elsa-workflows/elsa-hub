import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudBff, type CloudBffDeps } from "./handler.ts";
import {
  createCompatibilityCache,
  resetCloudCompatibilityCache,
} from "../_shared/cloud-compatibility.ts";
import { hasNoStore } from "../_shared/cloud-http.ts";
import {
  CLOUD_LIMIT_CODE,
  CLOUD_LIMIT_MESSAGE,
  CLOUD_ORG_LINK_CONFLICT,
  CLOUD_ORG_LINK_CONFLICT_CODE,
  CLOUD_ACCOUNT_LINK_ALREADY,
  CLOUD_ACCOUNT_LINK_CLOUD_MISSING,
  CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE,
  CLOUD_ACCOUNT_LINK_CONFLICT,
  CLOUD_ACCOUNT_LINK_CONFLICT_CODE,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE,
  CLOUD_ACCOUNT_LINK_HAS_STATE,
  CLOUD_ACCOUNT_LINK_HAS_STATE_CODE,
  CLOUD_ACCOUNT_LINK_REAUTH,
  CLOUD_ACCOUNT_LINK_REAUTH_CODE,
  CLOUD_ACCOUNT_LINK_SESSIONS,
  CLOUD_ACCOUNT_LINK_SESSIONS_CODE,
  CLOUD_ORG_LINK_FORBIDDEN,
  CLOUD_REQUIRED_CAPABILITIES,
  CLOUD_REQUIRED_READ_CAPABILITIES,
  CLOUD_REQUIRED_WRITE_CAPABILITIES,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  CLOUD_WRITE_ACTIONS,
} from "../_shared/cloud-types.ts";
import type { ControlCall, ControlResult } from "../_shared/cloud-control.ts";
import { signedInResolver, type HubUser } from "../_shared/cloud-hub-auth.ts";

const USER: HubUser = {
  id: "user-1",
  accessToken: "hub-session-token",
};

const WORKSPACE_ID = "11111111-1111-1111-1111-111111111111";
const ENGINE_ID = "22222222-2222-2222-2222-222222222222";
const ORGANIZATION_ID = "33333333-3333-3333-3333-333333333333";

const WORKSPACE = {
  id: WORKSPACE_ID,
  name: "Personal",
  kind: "personal",
  role: "Owner",
  organizationId: ORGANIZATION_ID,
  organizationName: "Acme",
  organizationRole: "Owner",
};

const COMPATIBLE = {
  contractVersion: 1,
  capabilities: [...CLOUD_REQUIRED_CAPABILITIES],
};

const COMPATIBLE_ROUTE = {
  "GET /api/cloud/compatibility": { ok: true as const, status: 200, body: COMPATIBLE },
};

function request(body: unknown, headers?: HeadersInit): Request {
  return new Request("https://hub.example.test/functions/v1/cloud-bff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer hub-session-token",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function controlMap(
  routes: Record<string, ControlResult>,
): (call: ControlCall, accessToken: string) => Promise<ControlResult> {
  return async (call, accessToken) => {
    assertEquals(accessToken, USER.accessToken);
    const key = `${call.method} ${call.path}`;
    const result = routes[key];
    assert(result, `unexpected Control call ${key}`);
    return result;
  };
}

const HUB_ORG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function signedIn(
  body: unknown,
  routes: Record<string, ControlResult>,
  extra: Partial<CloudBffDeps> = {},
): Promise<Response> {
  resetCloudCompatibilityCache();
  return await handleCloudBff(request(body), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: extra.controlFetch ?? controlMap({ ...COMPATIBLE_ROUTE, ...routes }),
    ...extra,
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  assert(hasNoStore(response));
  const body = await response.json();
  assertEquals(typeof body, "object");
  return body as Record<string, unknown>;
}

Deno.test("anonymous calls are refused", async () => {
  const missing = await handleCloudBff(
    new Request("https://hub.example.test/functions/v1/cloud-bff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "compatibility" }),
    }),
    { resolveHubUser: async () => null },
  );
  const missingBody = await readJson(missing);
  assertEquals(missing.status, 401);
  assertEquals(missingBody.code, "unauthorized");
  assertFalse("raw" in missingBody);

  const rejected = await handleCloudBff(request({ action: "compatibility" }), {
    resolveHubUser: async () => null,
  });
  assertEquals(rejected.status, 401);
  const rejectedBody = await readJson(rejected);
  assertEquals(rejectedBody.error, "Sign in required.");
});

Deno.test("each read action returns the normalized shape for a signed-in user", async () => {
  const compatibility = await signedIn({ action: "compatibility" }, {
    "GET /api/cloud/compatibility": { ok: true, status: 200, body: COMPATIBLE },
  });
  assertEquals(compatibility.status, 200);
  assertEquals(await readJson(compatibility), {
    ok: true,
    state: "compatible",
    contractVersion: 1,
    capabilities: COMPATIBLE.capabilities,
  });

  const bootstrap = await signedIn({ action: "bootstrap" }, {
    "POST /api/cloud/bootstrap": {
      ok: true,
      status: 200,
      body: { organizationId: ORGANIZATION_ID, workspaceId: WORKSPACE_ID },
    },
  });
  assertEquals(await readJson(bootstrap), {
    ok: true,
    state: "ready",
    organizationId: ORGANIZATION_ID,
    workspaceId: WORKSPACE_ID,
  });

  const listWorkspaces = await signedIn({ action: "listWorkspaces" }, {
    "GET /api/me/workspaces": {
      ok: true,
      status: 200,
      body: { workspaces: [WORKSPACE] },
    },
  });
  assertEquals(await readJson(listWorkspaces), {
    ok: true,
    state: "ready",
    workspaces: [WORKSPACE],
  });

  const selectWorkspace = await signedIn({
    action: "selectWorkspace",
    workspaceId: WORKSPACE_ID,
  }, {
    "GET /api/me/workspaces": {
      ok: true,
      status: 200,
      body: { workspaces: [WORKSPACE] },
    },
  });
  assertEquals(await readJson(selectWorkspace), {
    ok: true,
    state: "ready",
    workspace: WORKSPACE,
  });

  const listEngines = await signedIn({
    action: "listEngines",
    workspaceId: WORKSPACE_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances`]: {
      ok: true,
      status: 200,
      body: {
        items: [{
          instanceId: ENGINE_ID,
          name: "Prod",
          slug: "prod",
          observedLifecycle: "Ready",
          currentResolvedRelease: { version: "3.9.0" },
        }],
      },
    },
  });
  assertEquals(await readJson(listEngines), {
    ok: true,
    state: "ready",
    workspaceId: WORKSPACE_ID,
    engines: [{
      id: ENGINE_ID,
      name: "Prod",
      slug: "prod",
      status: "Ready",
      release: "3.9.0",
    }],
  });

  const emptyEngines = await signedIn({
    action: "listEngines",
    workspaceId: WORKSPACE_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances`]: {
      ok: true,
      status: 200,
      body: { items: [] },
    },
  });
  assertEquals(await readJson(emptyEngines), {
    ok: true,
    state: "empty",
    workspaceId: WORKSPACE_ID,
    engines: [],
  });

  const overview = await signedIn({
    action: "engineOverview",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/overview`]: {
      ok: true,
      status: 200,
      body: {
        summary: {
          instanceId: ENGINE_ID,
          name: "Prod",
          slug: "prod",
          observedLifecycle: "Ready",
          canOpen: true,
        },
        health: { status: "Healthy" },
        release: { version: "3.9.0" },
      },
    },
  });
  assertEquals(await readJson(overview), {
    ok: true,
    state: "ready",
    workspaceId: WORKSPACE_ID,
    engine: {
      id: ENGINE_ID,
      name: "Prod",
      slug: "prod",
      status: "Ready",
      release: "3.9.0",
      health: "Healthy",
      canOpen: true,
      version: null,
      etag: null,
      organizationId: null,
      audience: null,
      redirectUri: null,
      allowedActions: {
        restart: { allowed: false, reasonCode: null },
        applyRelease: { allowed: false, reasonCode: null },
        open: { allowed: false, reasonCode: null },
        delete: { allowed: false, reasonCode: null },
      },
    },
  });
});

Deno.test("unknown actions and extra fields are refused", async () => {
  const unknown = await signedIn({ action: "notAnAction" }, {});
  const unknownBody = await readJson(unknown);
  assertEquals(unknown.status, 400);
  assertEquals(unknownBody.code, "unknown_action");
  assertFalse(JSON.stringify(unknownBody).includes("notAnAction"));

  const extra = await signedIn({
    action: "compatibility",
    debug: true,
  }, {});
  const extraBody = await readJson(extra);
  assertEquals(extra.status, 400);
  assertEquals(extraBody.code, "unexpected_fields");

  const extraOnSelect = await signedIn({
    action: "selectWorkspace",
    workspaceId: WORKSPACE_ID,
    organizationId: ORGANIZATION_ID,
  }, {});
  assertEquals((await readJson(extraOnSelect)).code, "unexpected_fields");

  const foreign = await signedIn({
    action: "selectWorkspace",
    workspaceId: "44444444-4444-4444-4444-444444444444",
  }, {
    "GET /api/me/workspaces": {
      ok: true,
      status: 200,
      body: { workspaces: [WORKSPACE] },
    },
  });
  const foreignBody = await readJson(foreign);
  assertEquals(foreign.status, 403);
  assertEquals(foreignBody.code, "forbidden");
});

Deno.test("Control outage or incompatible version returns the sanitized updating state", async () => {
  const thrown = await handleCloudBff(request({ action: "bootstrap" }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async () => {
      throw new Error("upstream socket reset: Host=secret");
    },
  });
  const thrownBody = await readJson(thrown);
  assertEquals(thrown.status, 503);
  assertEquals(thrownBody.code, CLOUD_UPDATING_CODE);
  assertFalse(JSON.stringify(thrownBody).includes("Host=secret"));

  const updating = await handleCloudBff(request({ action: "bootstrap" }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async () => ({ ok: false, kind: "updating" }),
  });
  const updatingBody = await readJson(updating);
  assertEquals(updating.status, 503);
  assertEquals(updatingBody, {
    ok: false,
    state: "updating",
    code: CLOUD_UPDATING_CODE,
    error: CLOUD_UPDATING_MESSAGE,
  });

  const incompatible = await signedIn({ action: "compatibility" }, {
    "GET /api/cloud/compatibility": {
      ok: true,
      status: 200,
      body: { contractVersion: 0, capabilities: COMPATIBLE.capabilities },
    },
  });
  const incompatibleBody = await readJson(incompatible);
  assertEquals(incompatible.status, 503);
  assertEquals(incompatibleBody.code, CLOUD_UPDATING_CODE);
  assertEquals(incompatibleBody.error, CLOUD_UPDATING_MESSAGE);
  assertFalse(JSON.stringify(incompatibleBody).includes("contractVersion"));

  const missingCapability = await signedIn({ action: "compatibility" }, {
    "GET /api/cloud/compatibility": {
      ok: true,
      status: 200,
      body: { contractVersion: 1, capabilities: ["cloud.bootstrap.v1"] },
    },
  });
  assertEquals((await readJson(missingCapability)).code, CLOUD_UPDATING_CODE);

  const rawUpstream = await handleCloudBff(request({ action: "listWorkspaces" }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async () => ({
      ok: true,
      status: 200,
      body: {
        error: "stack trace at Control.Internal",
        details: { connectionString: "Host=secret" },
      },
    }),
  });
  const sanitized = await readJson(rawUpstream);
  assertEquals(rawUpstream.status, 503);
  assertEquals(sanitized.code, CLOUD_UPDATING_CODE);
  const serialized = JSON.stringify(sanitized);
  assertFalse(serialized.includes("stack trace"));
  assertFalse(serialized.includes("connectionString"));
  assertFalse(serialized.includes("Host=secret"));
});

Deno.test("responses are no-store", async () => {
  const response = await signedIn({ action: "compatibility" }, {
    "GET /api/cloud/compatibility": { ok: true, status: 200, body: COMPATIBLE },
  });
  assert(hasNoStore(response));
});

const IDEMPOTENCY_KEY = "44444444-4444-4444-4444-444444444444";
const OPERATION_ID = "55555555-5555-5555-5555-555555555555";
const CONFIRMATION_ID = "66666666-6666-6666-6666-666666666666";

const INTENT = {
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
};

const LAUNCH_PROFILE = {
  name: "West Europe Dedicated",
  description: "Managed hosting in West Europe.",
  targetMode: "managed",
  regionCode: "westeurope",
  isolationProfile: "dedicated",
  capacityProfile: "standard-small",
  networkOutcome: "public",
  domainOutcome: "managed",
};

Deno.test("lifecycle actions map to one Control endpoint and return normalized shapes", async () => {
  const options = await signedIn({
    action: "onboardingOptions",
    workspaceId: WORKSPACE_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances/onboarding-options`]: {
      ok: true,
      status: 200,
      body: {
        releases: [{
          distributionId: "valence-runtime",
          releaseLine: "3.8",
          version: "3.8.4",
          channel: "stable",
          topologyId: "combined",
        }],
        previewReleases: [],
        launchProfile: LAUNCH_PROFILE,
      },
    },
  });
  assertEquals(options.status, 200);
  assertEquals((await readJson(options)).state, "ready");

  const created = await signedIn({
    action: "createEngine",
    workspaceId: WORKSPACE_ID,
    name: "Prod",
    slug: "prod",
    intent: INTENT,
    idempotencyKey: IDEMPOTENCY_KEY,
  }, {
    [`POST /api/workspaces/${WORKSPACE_ID}/instances`]: {
      ok: true,
      status: 202,
      body: {
        instance: {
          instanceId: ENGINE_ID,
          name: "Prod",
          slug: "prod",
          observedLifecycle: "Provisioning",
        },
        operation: { id: OPERATION_ID, action: "Create", state: "Accepted" },
      },
    },
  });
  assertEquals(created.status, 202);
  assertEquals(await readJson(created), {
    ok: true,
    state: "accepted",
    workspaceId: WORKSPACE_ID,
    engine: {
      id: ENGINE_ID,
      name: "Prod",
      slug: "prod",
      status: "Provisioning",
      release: null,
    },
    operation: { id: OPERATION_ID, action: "Create", state: "Accepted" },
  });

  const progress = await signedIn({
    action: "provisioningProgress",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/provisioning-progress`]: {
      ok: true,
      status: 200,
      body: {
        state: "active",
        currentStage: "runtime-deployment",
        stages: [{ code: "request-accepted", status: "completed" }],
      },
    },
  });
  const progressBody = await readJson(progress);
  assertEquals((progressBody.progress as { currentStage: string }).currentStage, "runtime-deployment");

  const activity = await signedIn({
    action: "engineActivity",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/activity`]: {
      ok: true,
      status: 200,
      body: {
        items: [{
          sequence: 1,
          eventType: "lifecycle.accepted",
          occurredAt: "2026-10-15T00:00:00Z",
          severity: "Informational",
        }],
        hasMore: false,
      },
    },
  });
  const activityBody = await readJson(activity);
  assertEquals((activityBody.items as unknown[]).length, 1);

  const restart = await signedIn({
    action: "restartEngine",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    ifMatch: '"1"',
  }, {
    [`POST /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/restart`]: {
      ok: true,
      status: 202,
      body: { operationId: OPERATION_ID, action: "Restart", state: "Accepted" },
    },
  });
  assertEquals((await readJson(restart)).state, "accepted");

  const apply = await signedIn({
    action: "applyRelease",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    version: "3.8.5",
    idempotencyKey: IDEMPOTENCY_KEY,
    ifMatch: '"1"',
  }, {
    [`POST /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/apply-release`]: {
      ok: true,
      status: 202,
      body: { id: OPERATION_ID, action: "UpdateIntent", state: "Accepted" },
    },
  });
  const applyBody = await readJson(apply);
  assertEquals((applyBody.operation as { action: string }).action, "UpdateIntent");

  const confirm = await signedIn({
    action: "confirmDelete",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
  }, {
    [`POST /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/delete-confirmations`]: {
      ok: true,
      status: 200,
      body: {
        id: CONFIRMATION_ID,
        expiresAt: "2026-10-15T01:00:00Z",
        billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
      },
    },
  });
  const confirmBody = await readJson(confirm);
  assertEquals((confirmBody.confirmation as { id: string }).id, CONFIRMATION_ID);

  const deleted = await signedIn({
    action: "deleteEngine",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    deleteConfirmationId: CONFIRMATION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    ifMatch: '"1"',
  }, {
    [`POST /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/delete`]: {
      ok: true,
      status: 202,
      body: { operationId: OPERATION_ID, action: "Delete", state: "Accepted" },
    },
  });
  const deletedBody = await readJson(deleted);
  assertEquals((deletedBody.operation as { state: string }).state, "Accepted");

  const status = await signedIn({
    action: "deleteOperationStatus",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    operationId: OPERATION_ID,
  }, {
    [`GET /api/workspaces/${WORKSPACE_ID}/instances/${ENGINE_ID}/delete-operations/${OPERATION_ID}`]: {
      ok: true,
      status: 200,
      body: { id: OPERATION_ID, action: "Delete", state: "Succeeded" },
    },
  });
  const statusBody = await readJson(status);
  assertEquals((statusBody.operation as { state: string }).state, "Succeeded");

  const handoff = await signedIn({
    action: "issueStudioHandoff",
    organizationId: ORGANIZATION_ID,
    engineId: ENGINE_ID,
    audience: "https://studio.example",
    redirectUri: "https://studio.example/handoff",
    codeChallenge: "challenge",
  }, {
    "POST /api/managed-elsa/handoff/issue": {
      ok: true,
      status: 200,
      body: {
        token: "handoff-token",
        tokenType: "Bearer",
        audience: "https://studio.example",
        redirectUri: "https://studio.example/handoff",
        issuedAt: "2026-10-15T00:00:00Z",
        expiresAt: "2026-10-15T00:05:00Z",
      },
    },
  });
  assertEquals(handoff.status, 200);
  assertEquals((await readJson(handoff)).state, "ready");
});

Deno.test("a create at the plan limit is sanitized and does not forward the Control body", async () => {
  resetCloudCompatibilityCache();
  const response = await handleCloudBff(request({
    action: "createEngine",
    workspaceId: WORKSPACE_ID,
    name: "Second",
    slug: "second",
    intent: INTENT,
    idempotencyKey: IDEMPOTENCY_KEY,
  }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async (call) => {
      if (call.path === "/api/cloud/compatibility") {
        return { ok: true, status: 200, body: COMPATIBLE };
      }
      return {
        ok: false,
        kind: "limit",
        code: CLOUD_LIMIT_CODE,
        currentInstances: 1,
        maxInstances: 1,
      };
    },
  });
  const body = await readJson(response);
  assertEquals(response.status, 422);
  assertEquals(body, {
    ok: false,
    code: CLOUD_LIMIT_CODE,
    error: CLOUD_LIMIT_MESSAGE,
    currentInstances: 1,
    maxInstances: 1,
  });
  assertFalse(JSON.stringify(body).includes("stack"));
  assertFalse(JSON.stringify(body).includes("provider"));
});

Deno.test("lifecycle extra fields are refused", async () => {
  const extra = await signedIn({
    action: "createEngine",
    workspaceId: WORKSPACE_ID,
    name: "Prod",
    slug: "prod",
    intent: INTENT,
    idempotencyKey: IDEMPOTENCY_KEY,
    debug: true,
  }, {});
  assertEquals((await readJson(extra)).code, "unexpected_fields");
});

const BOOTSTRAP_BODY = {
  organizationId: ORGANIZATION_ID,
  workspaceId: WORKSPACE_ID,
};

const BOOTSTRAP_ROUTE = {
  "POST /api/cloud/bootstrap": {
    ok: true as const,
    status: 200,
    body: BOOTSTRAP_BODY,
  },
};

Deno.test("bootstrap without a Hub org does not persist a Control link", async () => {
  let persistCalls = 0;
  const response = await signedIn({ action: "bootstrap" }, BOOTSTRAP_ROUTE, {
    persistLinkFromValidatedBootstrap: async () => {
      persistCalls += 1;
      return {
        ok: true,
        link: {
          hubOrganizationId: HUB_ORG_ID,
          controlOrganizationId: ORGANIZATION_ID,
          validatedAt: "2026-10-16T00:00:00Z",
        },
      };
    },
    userClient: { rpc: async () => ({ data: true, error: null }) },
    serviceClient: {},
  });
  assertEquals(persistCalls, 0);
  assertEquals(await readJson(response), {
    ok: true,
    state: "ready",
    organizationId: ORGANIZATION_ID,
    workspaceId: WORKSPACE_ID,
  });
});

Deno.test("bootstrap persists the Control org from the validated bootstrap only", async () => {
  let persisted: {
    hubOrganizationId: string;
    bootstrap: { organizationId: string; workspaceId: string };
  } | undefined;
  const response = await signedIn({
    action: "bootstrap",
    hubOrganizationId: HUB_ORG_ID,
  }, BOOTSTRAP_ROUTE, {
    persistLinkFromValidatedBootstrap: async (input) => {
      persisted = {
        hubOrganizationId: input.hubOrganizationId,
        bootstrap: input.bootstrap,
      };
      return {
        ok: true,
        link: {
          hubOrganizationId: input.hubOrganizationId,
          controlOrganizationId: input.bootstrap.organizationId,
          validatedAt: "2026-10-16T00:00:00Z",
        },
      };
    },
    userClient: { rpc: async () => ({ data: true, error: null }) },
    serviceClient: {},
  });
  assertEquals(persisted, {
    hubOrganizationId: HUB_ORG_ID,
    bootstrap: BOOTSTRAP_BODY,
  });
  assertEquals(await readJson(response), {
    ok: true,
    state: "ready",
    organizationId: ORGANIZATION_ID,
    workspaceId: WORKSPACE_ID,
  });
});

Deno.test("bootstrap conflict is a clear error and does not overwrite the link", async () => {
  const response = await signedIn({
    action: "bootstrap",
    hubOrganizationId: HUB_ORG_ID,
  }, BOOTSTRAP_ROUTE, {
    persistLinkFromValidatedBootstrap: async () => ({ ok: false, code: "conflict" }),
    userClient: { rpc: async () => ({ data: true, error: null }) },
    serviceClient: {},
  });
  const body = await readJson(response);
  assertEquals(response.status, 409);
  assertEquals(body, {
    ok: false,
    code: CLOUD_ORG_LINK_CONFLICT_CODE,
    error: CLOUD_ORG_LINK_CONFLICT,
  });
  assertFalse(JSON.stringify(body).includes("23505"));
  assertFalse(JSON.stringify(body).includes("control_organization_id"));
});

Deno.test("bootstrap refuses a client Control organization id", async () => {
  const extra = await signedIn({
    action: "bootstrap",
    hubOrganizationId: HUB_ORG_ID,
    controlOrganizationId: ORGANIZATION_ID,
  }, {});
  assertEquals((await readJson(extra)).code, "unexpected_fields");
});

Deno.test("a failed Control bootstrap does not persist a link", async () => {
  let persistCalls = 0;
  const persist = async () => {
    persistCalls += 1;
    return {
      ok: true as const,
      link: {
        hubOrganizationId: HUB_ORG_ID,
        controlOrganizationId: ORGANIZATION_ID,
        validatedAt: "2026-10-16T00:00:00Z",
      },
    };
  };
  const extra = {
    persistLinkFromValidatedBootstrap: persist,
    userClient: { rpc: async () => ({ data: true, error: null }) },
    serviceClient: {},
  };

  const outage = await handleCloudBff(
    request({ action: "bootstrap", hubOrganizationId: HUB_ORG_ID }),
    {
      resolveHubUser: signedInResolver(USER),
      controlFetch: async () => ({ ok: false, kind: "updating" }),
      ...extra,
    },
  );
  assertEquals(outage.status, 503);
  assertEquals((await readJson(outage)).code, CLOUD_UPDATING_CODE);

  const forbidden = await handleCloudBff(
    request({ action: "bootstrap", hubOrganizationId: HUB_ORG_ID }),
    {
      resolveHubUser: signedInResolver(USER),
      controlFetch: async () => ({ ok: false, kind: "forbidden" }),
      ...extra,
    },
  );
  assertEquals(forbidden.status, 403);
  assertEquals((await readJson(forbidden)).code, "forbidden");

  const invalid = await signedIn({
    action: "bootstrap",
    hubOrganizationId: HUB_ORG_ID,
  }, {
    "POST /api/cloud/bootstrap": {
      ok: true,
      status: 200,
      body: { organizationId: "not-a-guid", workspaceId: WORKSPACE_ID },
    },
  }, extra);
  assertEquals(invalid.status, 503);
  assertEquals((await readJson(invalid)).code, CLOUD_UPDATING_CODE);
  assertEquals(persistCalls, 0);
});

Deno.test("bootstrap persist forbidden is a clear admin-only error", async () => {
  const response = await signedIn({
    action: "bootstrap",
    hubOrganizationId: HUB_ORG_ID,
  }, BOOTSTRAP_ROUTE, {
    persistLinkFromValidatedBootstrap: async () => ({ ok: false, code: "forbidden" }),
    userClient: { rpc: async () => ({ data: false, error: null }) },
    serviceClient: {},
  });
  const body = await readJson(response);
  assertEquals(response.status, 403);
  assertEquals(body, {
    ok: false,
    code: "forbidden",
    error: CLOUD_ORG_LINK_FORBIDDEN,
  });
});

const WRITE_REQUESTS: Record<(typeof CLOUD_WRITE_ACTIONS)[number], unknown> = {
  createEngine: {
    action: "createEngine",
    workspaceId: WORKSPACE_ID,
    name: "Prod",
    slug: "prod",
    intent: INTENT,
    idempotencyKey: IDEMPOTENCY_KEY,
  },
  restartEngine: {
    action: "restartEngine",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    ifMatch: '"1"',
  },
  applyRelease: {
    action: "applyRelease",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    version: "3.8.5",
    idempotencyKey: IDEMPOTENCY_KEY,
    ifMatch: '"1"',
  },
  confirmDelete: {
    action: "confirmDelete",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
  },
  deleteEngine: {
    action: "deleteEngine",
    workspaceId: WORKSPACE_ID,
    engineId: ENGINE_ID,
    deleteConfirmationId: CONFIRMATION_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    ifMatch: '"1"',
  },
  issueStudioHandoff: {
    action: "issueStudioHandoff",
    organizationId: ORGANIZATION_ID,
    engineId: ENGINE_ID,
    audience: "https://studio.example",
    redirectUri: "https://studio.example/handoff",
    codeChallenge: "challenge",
  },
};

async function writeGateResponse(
  body: unknown,
  compatibility: ControlResult,
): Promise<{ status: number; json: Record<string, unknown>; calls: string[] }> {
  resetCloudCompatibilityCache();
  const calls: string[] = [];
  const response = await handleCloudBff(request(body), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async (call) => {
      calls.push(`${call.method} ${call.path}`);
      if (call.path === "/api/cloud/compatibility") return compatibility;
      throw new Error(`unexpected Control write ${call.method} ${call.path}`);
    },
  });
  return { status: response.status, json: await readJson(response), calls };
}

Deno.test("insufficient or unreadable contracts block every write without a Control write call", async () => {
  const blocked: ControlResult[] = [
    {
      ok: true,
      status: 200,
      body: {
        contractVersion: 1,
        capabilities: [...CLOUD_REQUIRED_READ_CAPABILITIES],
      },
    },
    {
      ok: true,
      status: 200,
      body: {
        contractVersion: 1,
        capabilities: [
          ...CLOUD_REQUIRED_READ_CAPABILITIES.filter((item) => item !== "hosted.instances.list.v1"),
          ...CLOUD_REQUIRED_WRITE_CAPABILITIES,
        ],
      },
    },
    {
      ok: true,
      status: 200,
      body: { contractVersion: 0, capabilities: [...CLOUD_REQUIRED_CAPABILITIES] },
    },
    { ok: false, kind: "updating" },
  ];

  for (const compatibility of blocked) {
    for (const action of CLOUD_WRITE_ACTIONS) {
      const result = await writeGateResponse(WRITE_REQUESTS[action], compatibility);
      assertEquals(result.status, 503, action);
      assertEquals(result.json.code, CLOUD_UPDATING_CODE, action);
      assertEquals(result.json.error, CLOUD_UPDATING_MESSAGE, action);
      assertEquals(result.calls, ["GET /api/cloud/compatibility"], action);
      assertFalse(JSON.stringify(result.json).includes("contractVersion"));
    }
  }
});

Deno.test("a compatible contract forwards write actions unchanged", async () => {
  resetCloudCompatibilityCache();
  const calls: string[] = [];
  const created = await handleCloudBff(request(WRITE_REQUESTS.createEngine), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async (call) => {
      calls.push(`${call.method} ${call.path}`);
      if (call.path === "/api/cloud/compatibility") {
        return { ok: true, status: 200, body: COMPATIBLE };
      }
      assertEquals(call.method, "POST");
      assertEquals(call.path, `/api/workspaces/${WORKSPACE_ID}/instances`);
      return {
        ok: true,
        status: 202,
        body: {
          instance: {
            instanceId: ENGINE_ID,
            name: "Prod",
            slug: "prod",
            observedLifecycle: "Provisioning",
          },
          operation: { id: OPERATION_ID, action: "Create", state: "Accepted" },
        },
      };
    },
  });
  assertEquals(created.status, 202);
  assertEquals((await readJson(created)).state, "accepted");
  assertEquals(calls, [
    "GET /api/cloud/compatibility",
    `POST /api/workspaces/${WORKSPACE_ID}/instances`,
  ]);
});

Deno.test("read actions stay available when only a write capability is missing", async () => {
  resetCloudCompatibilityCache();
  const calls: string[] = [];
  const missingWrite = {
    contractVersion: 1,
    capabilities: [...CLOUD_REQUIRED_READ_CAPABILITIES],
  };
  const list = await handleCloudBff(request({
    action: "listEngines",
    workspaceId: WORKSPACE_ID,
  }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async (call) => {
      calls.push(`${call.method} ${call.path}`);
      if (call.path === "/api/cloud/compatibility") {
        return { ok: true, status: 200, body: missingWrite };
      }
      assertEquals(call.path, `/api/workspaces/${WORKSPACE_ID}/instances`);
      return {
        ok: true,
        status: 200,
        body: {
          items: [{
            instanceId: ENGINE_ID,
            name: "Prod",
            slug: "prod",
            observedLifecycle: "Ready",
          }],
        },
      };
    },
  });
  assertEquals(list.status, 200);
  assertEquals((await readJson(list)).state, "ready");
  assertEquals(calls, [`GET /api/workspaces/${WORKSPACE_ID}/instances`]);

  const blocked = await writeGateResponse(WRITE_REQUESTS.createEngine, {
    ok: true,
    status: 200,
    body: missingWrite,
  });
  assertEquals(blocked.status, 503);
  assertEquals(blocked.calls, ["GET /api/cloud/compatibility"]);
});

Deno.test("compatibility reads for writes are cached per isolate for at most 60s", async () => {
  let now = 1_000;
  const cache = createCompatibilityCache({ ttlMs: 60_000, now: () => now });
  const calls: string[] = [];
  const run = () =>
    handleCloudBff(request(WRITE_REQUESTS.restartEngine), {
      resolveHubUser: signedInResolver(USER),
      compatibilityCache: cache,
      controlFetch: async (call) => {
        calls.push(`${call.method} ${call.path}`);
        if (call.path === "/api/cloud/compatibility") {
          return { ok: true, status: 200, body: COMPATIBLE };
        }
        return {
          ok: true,
          status: 202,
          body: { operationId: OPERATION_ID, action: "Restart", state: "Accepted" },
        };
      },
    });

  assertEquals((await run()).status, 202);
  assertEquals((await run()).status, 202);
  assertEquals(calls.filter((call) => call.includes("/api/cloud/compatibility")).length, 1);
  assertEquals(calls.filter((call) => call.endsWith("/restart")).length, 2);

  now = 61_000;
  assertEquals((await run()).status, 202);
  assertEquals(calls.filter((call) => call.includes("/api/cloud/compatibility")).length, 2);
  assertEquals(calls.filter((call) => call.endsWith("/restart")).length, 3);
});

const CLOUD_TOKEN = "cloud-session-token";
const ACCOUNT_ID = "77777777-7777-4777-8777-777777777777";

Deno.test("linkCloudAccount attaches both sessions and returns linked", async () => {
  let seenCloud = "";
  let seenHub = "";
  let seenAuth = "";
  let seenBody: unknown;
  const response = await handleCloudBff(request({
    action: "linkCloudAccount",
    cloudAccessToken: CLOUD_TOKEN,
  }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async (call, accessToken) => {
      assertEquals(accessToken, USER.accessToken);
      assertEquals(call.method, "POST");
      assertEquals(call.path, "/api/cloud/account-links");
      seenAuth = `Bearer ${accessToken}`;
      seenHub = call.headers?.["X-Elsa-Hub-Authorization"] ?? "";
      seenCloud = call.headers?.["X-Elsa-Cloud-Authorization"] ?? "";
      seenBody = call.body;
      return {
        ok: true,
        status: 200,
        body: { accountId: ACCOUNT_ID, alreadyLinked: false },
      };
    },
  });
  assertEquals(seenHub, `Bearer ${USER.accessToken}`);
  assertEquals(seenCloud, `Bearer ${CLOUD_TOKEN}`);
  assertEquals(seenAuth, `Bearer ${USER.accessToken}`);
  assertEquals(seenBody, {});
  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    ok: true,
    state: "linked",
    accountId: ACCOUNT_ID,
  });
});

Deno.test("linkCloudAccount already linked is a readable no-op", async () => {
  const response = await signedIn({
    action: "linkCloudAccount",
    cloudAccessToken: CLOUD_TOKEN,
  }, {
    "POST /api/cloud/account-links": {
      ok: true,
      status: 200,
      body: { accountId: ACCOUNT_ID, alreadyLinked: true },
    },
  });
  assertEquals(response.status, 200);
  assertEquals(await readJson(response), {
    ok: true,
    state: "already_linked",
    accountId: ACCOUNT_ID,
  });
  assertEquals(CLOUD_ACCOUNT_LINK_ALREADY.length > 0, true);
});

Deno.test("linkCloudAccount maps Control conflicts without changing anything", async () => {
  const cases = [
    {
      code: "cloud.account-link.cloud-account-missing",
      expected: CLOUD_ACCOUNT_LINK_CLOUD_MISSING_CODE,
      error: CLOUD_ACCOUNT_LINK_CLOUD_MISSING,
    },
    {
      code: "cloud.account-link.account-already-linked",
      expected: CLOUD_ACCOUNT_LINK_CONFLICT_CODE,
      error: CLOUD_ACCOUNT_LINK_CONFLICT,
    },
    {
      code: "cloud.account-link.hub-account-has-engines",
      expected: CLOUD_ACCOUNT_LINK_HAS_ENGINES_CODE,
      error: CLOUD_ACCOUNT_LINK_HAS_ENGINES,
    },
    {
      code: "cloud.account-link.hub-account-has-state",
      expected: CLOUD_ACCOUNT_LINK_HAS_STATE_CODE,
      error: CLOUD_ACCOUNT_LINK_HAS_STATE,
    },
  ];
  for (const item of cases) {
    const response = await handleCloudBff(request({
      action: "linkCloudAccount",
      cloudAccessToken: CLOUD_TOKEN,
    }), {
      resolveHubUser: signedInResolver(USER),
      controlFetch: async () => ({ ok: false, kind: "invalid", code: item.code }),
    });
    const body = await readJson(response);
    assertEquals(response.status, 409, item.code);
    assertEquals(body, { ok: false, code: item.expected, error: item.error });
    assertFalse(JSON.stringify(body).includes("cloud.account-link"));
    assertFalse(JSON.stringify(body).includes(CLOUD_TOKEN));
  }
});

Deno.test("linkCloudAccount maps reauthentication-required including staleSession", async () => {
  for (const staleSession of ["hub", "cloud", "both"] as const) {
    const response = await handleCloudBff(request({
      action: "linkCloudAccount",
      cloudAccessToken: CLOUD_TOKEN,
    }), {
      resolveHubUser: signedInResolver(USER),
      controlFetch: async () => ({
        ok: false,
        kind: "unauthorized",
        code: "cloud.account-link.reauthentication-required",
        staleSession,
      }),
    });
    const body = await readJson(response);
    assertEquals(response.status, 401);
    assertEquals(body, {
      ok: false,
      code: CLOUD_ACCOUNT_LINK_REAUTH_CODE,
      error: CLOUD_ACCOUNT_LINK_REAUTH,
      staleSession,
    });
    assertFalse(JSON.stringify(body).includes("WWW-Authenticate"));
    assertFalse(JSON.stringify(body).includes(CLOUD_TOKEN));
  }

  const sessions = await handleCloudBff(request({
    action: "linkCloudAccount",
    cloudAccessToken: CLOUD_TOKEN,
  }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async () => ({
      ok: false,
      kind: "unauthorized",
      code: "cloud.account-link.sessions-required",
    }),
  });
  assertEquals(sessions.status, 401);
  assertEquals(await readJson(sessions), {
    ok: false,
    code: CLOUD_ACCOUNT_LINK_SESSIONS_CODE,
    error: CLOUD_ACCOUNT_LINK_SESSIONS,
  });
});

Deno.test("linkCloudAccount refuses a missing Cloud token and never calls Control", async () => {
  let calls = 0;
  const missing = await handleCloudBff(request({ action: "linkCloudAccount" }), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: async () => {
      calls += 1;
      return { ok: false, kind: "updating" };
    },
  });
  assertEquals(missing.status, 400);
  assertEquals((await readJson(missing)).code, "invalid_request");
  assertEquals(calls, 0);
});
