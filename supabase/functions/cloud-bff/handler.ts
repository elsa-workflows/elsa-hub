import {
  dispatchCloudAction,
  parseCloudBffRequest,
  type PersistValidatedBootstrapLink,
} from "../_shared/cloud-actions.ts";
import type { CompatibilityCache } from "../_shared/cloud-compatibility.ts";
import { createControlFetch, type ControlFetch } from "../_shared/cloud-control.ts";
import {
  createHubUserResolver,
  type ResolveHubUser,
} from "../_shared/cloud-hub-auth.ts";
import { jsonResponse, preflightResponse } from "../_shared/cloud-http.ts";
import type { OrgAdminClient } from "../_shared/cloud-organization-link.ts";
import { updatingBody } from "../_shared/cloud-types.ts";

export type CloudBffDeps = {
  resolveHubUser?: ResolveHubUser;
  controlFetch?: ControlFetch;
  persistLinkFromValidatedBootstrap?: PersistValidatedBootstrapLink;
  userClient?: OrgAdminClient;
  serviceClient?: unknown;
  compatibilityCache?: CompatibilityCache;
};

async function createLinkClients(
  accessToken: string,
): Promise<{ userClient: OrgAdminClient; serviceClient: unknown } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) return null;

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
  return {
    userClient: createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }),
    serviceClient: createClient(supabaseUrl, serviceRoleKey),
  };
}

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
    let userClient = deps.userClient;
    let serviceClient = deps.serviceClient;
    if (
      parsed.request.action === "bootstrap" &&
      parsed.request.hubOrganizationId &&
      (!userClient || !serviceClient)
    ) {
      const clients = await createLinkClients(user.accessToken);
      if (!clients) return jsonResponse(503, updatingBody());
      userClient = clients.userClient;
      serviceClient = clients.serviceClient;
    }

    return await dispatchCloudAction({
      accessToken: user.accessToken,
      controlFetch: deps.controlFetch ?? createControlFetch(),
      persistLink: deps.persistLinkFromValidatedBootstrap,
      userClient,
      serviceClient,
      compatibilityCache: deps.compatibilityCache,
    }, parsed.request);
  } catch {
    return jsonResponse(503, updatingBody());
  }
}
