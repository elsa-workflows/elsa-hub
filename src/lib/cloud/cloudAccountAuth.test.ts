import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const signInWithPassword = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const signOut = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const getSession = vi.hoisted(() =>
  vi.fn(async () => ({ data: { session: { access_token: "cloud-session-token" } } }))
);
const createClient = vi.hoisted(() =>
  vi.fn(() => ({
    auth: { signInWithOAuth, signInWithPassword, signOut, getSession },
  })),
);

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

import {
  CLOUD_ACCOUNT_HUB_OWNER_KEY,
  CLOUD_ACCOUNT_STORAGE_KEY,
  cloudAccountClient,
  getCloudAccountAccessToken,
  resetCloudAccountClient,
  signInCloudAccountEmail,
  signInCloudAccountOAuth,
  signOutCloudAccount,
} from "./cloudAccountAuth";

function stubCloudEnv() {
  vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_URL", "https://cloud.example.supabase.co");
  vi.stubEnv("VITE_ELSA_CLOUD_SUPABASE_ANON_KEY", "anon");
}

describe("cloudAccountAuth", () => {
  afterEach(() => {
    sessionStorage.clear();
    resetCloudAccountClient();
    createClient.mockClear();
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
    signInWithPassword.mockReset();
    signInWithPassword.mockResolvedValue({ error: null });
    signOut.mockClear();
    getSession.mockClear();
    getSession.mockResolvedValue({ data: { session: { access_token: "cloud-session-token" } } });
    vi.unstubAllEnvs();
  });

  it("persists the Cloud session on sessionStorage next to the owner key", () => {
    stubCloudEnv();
    expect(cloudAccountClient()).not.toBeNull();
    expect(createClient).toHaveBeenCalledWith(
      "https://cloud.example.supabase.co",
      "anon",
      expect.objectContaining({
        auth: expect.objectContaining({
          storageKey: CLOUD_ACCOUNT_STORAGE_KEY,
          storage: sessionStorage,
        }),
      }),
    );
  });

  it("asks Azure for the email scope", async () => {
    stubCloudEnv();
    await signInCloudAccountOAuth("azure", "hub-user-a");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/cloud-callback`,
        scopes: "email",
      },
    });
  });

  it("writes the Hub owner before Cloud OAuth starts and clears it if sign-in fails", async () => {
    stubCloudEnv();
    signInWithOAuth.mockImplementationOnce(async () => {
      expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBe("hub-user-a");
      return { error: new Error("provider disabled") };
    });
    await expect(signInCloudAccountOAuth("google", "hub-user-a")).rejects.toThrow("provider disabled");
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBeNull();
  });

  it("writes the Hub owner before Cloud email sign-in starts", async () => {
    stubCloudEnv();
    signInWithPassword.mockImplementationOnce(async () => {
      expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBe("hub-user-a");
      return { error: null };
    });
    await signInCloudAccountEmail("user@example.com", "secret", "hub-user-a");
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBe("hub-user-a");
  });

  it("refuses a Cloud session started under a different Hub user", async () => {
    stubCloudEnv();
    sessionStorage.setItem(CLOUD_ACCOUNT_HUB_OWNER_KEY, "hub-user-a");
    await expect(getCloudAccountAccessToken("hub-user-b")).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBeNull();
  });

  it("refuses an unowned Cloud session, as in a new tab or after a browser reopen", async () => {
    stubCloudEnv();
    await expect(getCloudAccountAccessToken("hub-user-b")).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBeNull();
  });

  it("returns the Cloud token only when the owner matches the Hub user", async () => {
    stubCloudEnv();
    sessionStorage.setItem(CLOUD_ACCOUNT_HUB_OWNER_KEY, "hub-user-a");
    await expect(getCloudAccountAccessToken("hub-user-a")).resolves.toBe("cloud-session-token");
    expect(signOut).not.toHaveBeenCalled();
    await signOutCloudAccount();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(sessionStorage.getItem(CLOUD_ACCOUNT_HUB_OWNER_KEY)).toBeNull();
  });

  it("signs the Cloud client out locally so other Elsa Cloud sessions stay signed in", async () => {
    stubCloudEnv();
    await signOutCloudAccount();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
