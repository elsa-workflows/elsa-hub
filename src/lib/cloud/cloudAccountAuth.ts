import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CLOUD_ACCOUNT_STORAGE_KEY = "elsa-cloud-account";
export const CLOUD_ACCOUNT_CALLBACK_PATH = "/auth/cloud-callback";

export type CloudAccountOAuthProvider = "google" | "azure";

export function cloudAccountAuthConfig(): { url: string; anonKey: string } | null {
  const url = (import.meta.env.VITE_ELSA_CLOUD_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_ELSA_CLOUD_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isCloudAccountAuthConfigured(): boolean {
  return cloudAccountAuthConfig() !== null;
}

export function cloudAccountCallbackUrl(): string {
  return `${window.location.origin}${CLOUD_ACCOUNT_CALLBACK_PATH}`;
}

let client: SupabaseClient | null = null;

export function cloudAccountClient(): SupabaseClient | null {
  const config = cloudAccountAuthConfig();
  if (!config) return null;
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: CLOUD_ACCOUNT_STORAGE_KEY,
      },
    });
  }
  return client;
}

export async function getCloudAccountAccessToken(): Promise<string | null> {
  const auth = cloudAccountClient();
  if (!auth) return null;
  const { data } = await auth.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInCloudAccountOAuth(provider: CloudAccountOAuthProvider): Promise<void> {
  const auth = cloudAccountClient();
  if (!auth) throw new Error("Elsa Cloud sign-in is not configured.");
  const { error } = await auth.auth.signInWithOAuth({
    provider,
    options: { redirectTo: cloudAccountCallbackUrl() },
  });
  if (error) throw error;
}

export async function signInCloudAccountEmail(email: string, password: string): Promise<void> {
  const auth = cloudAccountClient();
  if (!auth) throw new Error("Elsa Cloud sign-in is not configured.");
  const { error } = await auth.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutCloudAccount(): Promise<void> {
  const auth = cloudAccountClient();
  if (!auth) return;
  await auth.auth.signOut();
}
