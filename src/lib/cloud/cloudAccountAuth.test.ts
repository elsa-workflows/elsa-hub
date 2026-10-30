import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const signOut = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const getSession = vi.hoisted(() =>
  vi.fn(async () => ({ data: { session: { access_token: "cloud-session-token" } } }))
);

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithOAuth, signOut, getSession },
  }),
}));

import {
  CLOUD_ACCOUNT_HUB_OWNER_KEY,
  getCloudAccountAccessToken,
  signInCloudAccountOAuth,
  signOutCloudAccount,
} from "./cloudAccountAuth";

describe("cloudAccountAuth", () => {
  afterEach(() => {
    sessionStorage.clear();
    signInWithOAuth.mockClear();
    signOut.mockClear();
    getSession.mockClear();
    vi.unstubAllEnvs();
  });

  it("asks Azure for the email scope", async () => {
    vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_URL", "https://cloud.example.supabase.co");
    vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_ANON_KEY", "anon");
    await signInCloudAccountOAuth("azure");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/cloud-callback`,
        scopes: "email",
      },
    });
  });

  it("refuses a Cloud session started under a different Hub user", async () => {
    vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_URL", "https://cloud.example.supabase.co");
    vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_ANON_KEY", "anon");
    sessionStorage.setItem(CLOUD_ACCOUNT_HUB_OWNER_KEY, "hub-user-a");
    await expect(getCloudAccountAccessToken("hub-user-b")).resolves.toBeNull();
    expect(signOut).toHaveBeenCalled();
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBeNull();
  });

  it("binds a Cloud session to the current Hub user", async () => {
    vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_URL", "https://cloud.example.supabase.co");
    vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_ANON_KEY", "anon");
    await expect(getCloudAccountAccessToken("hub-user-a")).resolves.toBe("cloud-session-token");
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBe("hub-user-a");
    await signOutCloudAccount();
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBeNull();
  });
});
