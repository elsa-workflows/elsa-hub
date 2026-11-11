/**
 * Guard for admin-only Edge Functions that run with `verify_jwt = false`.
 *
 * The caller must POST with `Authorization: Bearer <token>` where the token is
 * either the project's service role key (internal tooling) or the JWT of a
 * platform admin (same `is_platform_admin()` check as sync-mailerlite-subscribers).
 *
 *   405  any method other than POST (OPTIONS is answered by the caller first)
 *   401  no Bearer token, or a token that is neither the service role key nor a valid user JWT
 *   403  a valid user who is not a platform admin
 *
 * The service role path fails closed: when SUPABASE_SERVICE_ROLE_KEY is unset
 * it never matches, so an empty header cannot pass.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type AdminUserCheck = "admin" | "not_admin" | "invalid";

export interface AdminAuthDeps {
  /** Reads the service role key. Defaults to the function's environment. */
  serviceRoleKey: () => string | undefined;
  /** Decides what a non-service-role bearer token is. Defaults to a Supabase is_platform_admin() RPC. */
  checkUserToken: (token: string) => Promise<AdminUserCheck>;
}

function json(status: number, body: Record<string, unknown>, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Constant-time string compare; false when either side is empty. */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let ok = x.length === y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) ok = ok && x[i] === y[i];
  return ok;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function checkUserTokenWithSupabase(token: string): Promise<AdminUserCheck> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return "invalid";
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userRes, error: userError } = await client.auth.getUser(token);
  if (userError || !userRes.user) return "invalid";
  const { data: isAdmin } = await client.rpc("is_platform_admin");
  return isAdmin === true ? "admin" : "not_admin";
}

const defaultDeps: AdminAuthDeps = {
  serviceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  checkUserToken: checkUserTokenWithSupabase,
};

/**
 * Returns a Response to send back when the request is not allowed, or null when
 * the caller is authorised and the function may continue.
 */
export async function guardAdminPost(
  req: Request,
  corsHeaders: Record<string, string>,
  deps: AdminAuthDeps = defaultDeps,
): Promise<Response | null> {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, { ...corsHeaders, Allow: "POST, OPTIONS" });
  }
  const token = bearerToken(req);
  if (!token) return json(401, { error: "Unauthorized" }, corsHeaders);

  const serviceRoleKey = deps.serviceRoleKey();
  if (serviceRoleKey && safeEqual(token, serviceRoleKey)) return null;

  switch (await deps.checkUserToken(token)) {
    case "admin":
      return null;
    case "not_admin":
      return json(403, { error: "Forbidden - admin required" }, corsHeaders);
    default:
      return json(401, { error: "Unauthorized" }, corsHeaders);
  }
}
