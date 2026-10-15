import { jsonResponse } from "./cloud-http.ts";
import type { ControlFetch, ControlResult } from "./cloud-control.ts";
import {
  isCompatibleControl,
  normalizeBootstrap,
  normalizeCompatibility,
  normalizeEngineOverview,
  normalizeEngines,
  normalizeWorkspaces,
} from "./cloud-control.ts";
import {
  allowedFieldsFor,
  isCloudBffAction,
  isGuid,
  updatingBody,
  type CloudBffAction,
  type CloudBffRequest,
} from "./cloud-types.ts";

export type CloudActionContext = {
  accessToken: string;
  controlFetch: ControlFetch;
};

type ParsedRequest =
  | { ok: true; request: CloudBffRequest }
  | { ok: false; status: number; body: unknown };

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

  if (action === "selectWorkspace" || action === "listEngines" || action === "engineOverview") {
    if (!isGuid(record.workspaceId)) {
      return {
        ok: false,
        status: 400,
        body: { ok: false, code: "invalid_request", error: "A workspace id is required." },
      };
    }
  }
  if (action === "engineOverview" && !isGuid(record.engineId)) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, code: "invalid_request", error: "An engine id is required." },
    };
  }

  return { ok: true, request: record as CloudBffRequest };
}

function failedControl(result: Extract<ControlResult, { ok: false }>): Response {
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

async function callControl(
  ctx: CloudActionContext,
  action: CloudBffAction,
  request: CloudBffRequest,
): Promise<ControlResult> {
  switch (action) {
    case "compatibility":
      return await ctx.controlFetch({ method: "GET", path: "/api/cloud/compatibility" }, ctx.accessToken);
    case "bootstrap":
      return await ctx.controlFetch(
        { method: "POST", path: "/api/cloud/bootstrap", body: {} },
        ctx.accessToken,
      );
    case "listWorkspaces":
    case "selectWorkspace":
      return await ctx.controlFetch({ method: "GET", path: "/api/me/workspaces" }, ctx.accessToken);
    case "listEngines":
      return await ctx.controlFetch({
        method: "GET",
        path: `/api/workspaces/${request.workspaceId}/instances`,
      }, ctx.accessToken);
    case "engineOverview":
      return await ctx.controlFetch({
        method: "GET",
        path: `/api/workspaces/${request.workspaceId}/instances/${request.engineId}/overview`,
      }, ctx.accessToken);
  }
}

export async function dispatchCloudAction(
  ctx: CloudActionContext,
  request: CloudBffRequest,
): Promise<Response> {
  const result = await callControl(ctx, request.action, request);
  if (!result.ok) return failedControl(result);

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
      const engine = normalizeEngineOverview(result.body);
      if (!engine) return jsonResponse(503, updatingBody());
      return jsonResponse(200, {
        ok: true,
        state: "ready",
        workspaceId: request.workspaceId,
        engine,
      });
    }
  }
}
