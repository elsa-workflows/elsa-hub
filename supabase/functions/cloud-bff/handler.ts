import { dispatchCloudAction, parseCloudBffRequest } from "../_shared/cloud-actions.ts";
import { createControlFetch, type ControlFetch } from "../_shared/cloud-control.ts";
import {
  createHubUserResolver,
  type ResolveHubUser,
} from "../_shared/cloud-hub-auth.ts";
import { jsonResponse, preflightResponse } from "../_shared/cloud-http.ts";
import { updatingBody } from "../_shared/cloud-types.ts";

export type CloudBffDeps = {
  resolveHubUser?: ResolveHubUser;
  controlFetch?: ControlFetch;
};

export async function handleCloudBff(
  req: Request,
  deps: CloudBffDeps = {},
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflightResponse();
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      code: "invalid_request",
      error: "Use POST.",
    });
  }

  const resolveHubUser = deps.resolveHubUser ?? createHubUserResolver();
  const user = await resolveHubUser(req);
  if (!user) {
    return jsonResponse(401, {
      ok: false,
      code: "unauthorized",
      error: "Sign in required.",
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      code: "invalid_request",
      error: "Body must be valid JSON.",
    });
  }

  const parsed = parseCloudBffRequest(payload);
  if (!parsed.ok) {
    return jsonResponse(parsed.status, parsed.body);
  }

  try {
    return await dispatchCloudAction({
      accessToken: user.accessToken,
      controlFetch: deps.controlFetch ?? createControlFetch(),
    }, parsed.request);
  } catch {
    return jsonResponse(503, updatingBody());
  }
}
