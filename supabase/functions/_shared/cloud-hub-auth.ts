/**
 * Hub-login check for cloud-bff only.
 * This stays under `_shared/cloud*` so Academy functions do not share it.
 * A generic helper outside this prefix needs agreement on #44 first.
 */

export type HubUser = {
  id: string;
  accessToken: string;
};

export type ResolveHubUser = (req: Request) => Promise<HubUser | null>;

export function createHubUserResolver(
  env: { get: (key: string) => string | undefined } = Deno.env,
): ResolveHubUser {
  return async (req) => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) return null;

    const supabaseUrl = env.get("SUPABASE_URL");
    const supabaseAnonKey = env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user?.id) return null;
    return { id: data.user.id, accessToken };
  };
}

export function signedInResolver(user: HubUser): ResolveHubUser {
  return async () => user;
}

export function anonymousResolver(): ResolveHubUser {
  return async () => null;
}
