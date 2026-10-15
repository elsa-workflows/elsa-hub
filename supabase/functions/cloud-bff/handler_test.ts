import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCloudBff } from "./handler.ts";
import { hasNoStore } from "../_shared/cloud-http.ts";
import {
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
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
  capabilities: [
    "cloud.bootstrap.v1",
    "hosted.instances.list.v1",
    "hosted.instances.status.v1",
    "hosted.instances.overview.v1",
    "hosted.instances.create.v1",
  ],
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

async function signedIn(
  body: unknown,
  routes: Record<string, ControlResult>,
): Promise<Response> {
  return await handleCloudBff(request(body), {
    resolveHubUser: signedInResolver(USER),
    controlFetch: controlMap(routes),
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
    },
  });
});

Deno.test("unknown actions and extra fields are refused", async () => {
  const unknown = await signedIn({ action: "createEngine" }, {});
  const unknownBody = await readJson(unknown);
  assertEquals(unknown.status, 400);
  assertEquals(unknownBody.code, "unknown_action");
  assertFalse(JSON.stringify(unknownBody).includes("createEngine"));

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
