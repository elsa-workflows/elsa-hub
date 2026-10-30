import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const signOutCloudAccount = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/lib/cloud/cloudAccountAuth", () => ({
  signOutCloudAccount,
}));

const signInWithOAuth = vi.fn(async (_args?: unknown) => ({ error: null }));
const signInWithOtp = vi.fn(async (_args?: unknown) => ({ error: null }));
const signUp = vi.fn(async (_args?: unknown) => ({ error: null }));
const refreshSession = vi.fn(async () => ({ error: null }));
const signOut = vi.fn(async (_args?: unknown): Promise<{ error: Error | null }> => ({ error: null }));
const authStateListeners: Array<(event: string, session: unknown) => void> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authStateListeners.push(cb);
        return {
          data: { subscription: { unsubscribe: () => {} } },
        };
      },
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ error: null }),
      signUp: (args: unknown) => signUp(args),
      signInWithOAuth: (args: unknown) => signInWithOAuth(args),
      signInWithOtp: (args: unknown) => signInWithOtp(args),
      signOut: (args?: unknown) => signOut(args),
      refreshSession: () => refreshSession(),
    },
  },
}));

import { hasCloudSetupMarker, setCloudSetupMarker } from "@/lib/cloudClient/setupMarker";
import { AuthProvider, useAuth } from "./AuthContext";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("AuthContext passwordless methods", () => {
  beforeEach(() => {
    signInWithOAuth.mockClear();
    signInWithOtp.mockClear();
    signUp.mockClear();
    refreshSession.mockClear();
    signOut.mockClear();
    signOutCloudAccount.mockClear();
    authStateListeners.length = 0;
    sessionStorage.clear();
    localStorage.clear();
  });

  it("sends GitHub and Google OAuth through /auth/callback, not the site root", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signInWithGitHub();
    await result.current.signInWithGoogle();

    expect(signInWithOAuth).toHaveBeenNthCalledWith(1, {
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    expect(signInWithOAuth).toHaveBeenNthCalledWith(2, {
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });

  it("sends magic-link and email sign-up confirmations to /auth/confirm", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signInWithMagicLink("qa@example.com");
    await result.current.signUp("qa@example.com", "password123");

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "qa@example.com",
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        shouldCreateUser: true,
      },
    });
    expect(signUp).toHaveBeenCalledWith({
      email: "qa@example.com",
      password: "password123",
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
  });

  it("uses / on SIGNED_IN when the stored redirect is not a same-site path", async () => {
    sessionStorage.setItem("authRedirect", "//evil.com");
    let assigned = "";
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        origin: original.origin,
        get href() {
          return assigned || original.href;
        },
        set href(value: string) {
          assigned = value;
        },
      },
    });

    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));

    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(assigned).toBe("/"));
    expect(sessionStorage.getItem("authRedirect")).toBeNull();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });

  it("does not call refreshSession from onAuthStateChange", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("clears the cloud setup marker for the signed-out Hub user", async () => {
    setCloudSetupMarker("u1");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));

    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(result.current.user?.id).toBe("u1"));
    expect(hasCloudSetupMarker("u1")).toBe(true);

    await result.current.signOut();
    expect(hasCloudSetupMarker("u1")).toBe(false);
    expect(signOutCloudAccount).toHaveBeenCalled();
  });

  it("clears the Cloud session on Hub SIGNED_OUT from expiry", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));
    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(result.current.user?.id).toBe("u1"));
    signOutCloudAccount.mockClear();

    authStateListeners[0]("SIGNED_OUT", null);
    await waitFor(() => expect(signOutCloudAccount).toHaveBeenCalled());
  });

  it("clears the Cloud session on Hub SIGNED_OUT from another tab", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));
    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(result.current.user?.id).toBe("u1"));
    signOutCloudAccount.mockClear();

    // supabase-js surfaces another-tab Hub sign-out as SIGNED_OUT here.
    authStateListeners[0]("SIGNED_OUT", null);
    await waitFor(() => expect(signOutCloudAccount).toHaveBeenCalled());
  });

  it("clears the Cloud session on the local SIGNED_OUT that startHubReauth uses", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));
    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await waitFor(() => expect(result.current.user?.id).toBe("u1"));
    signOutCloudAccount.mockClear();

    await result.current.signOut({ scope: "local" });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signOutCloudAccount).toHaveBeenCalled();

    authStateListeners[0]("SIGNED_OUT", null);
    await waitFor(() => expect(signOutCloudAccount.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("forwards the sign-out scope and returns the sign-out error", async () => {
    const failure = new Error("network down");
    signOut.mockResolvedValueOnce({ error: failure });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(result.current.signOut({ scope: "local" })).resolves.toEqual({ error: failure });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  describe("cloud setup marker on sign-out", () => {
    async function signedInHook() {
      setCloudSetupMarker("u1");
      const rendered = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));
      authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
      await waitFor(() => expect(rendered.result.current.user?.id).toBe("u1"));
      return rendered.result;
    }

    it("keeps the marker when sign-out fails", async () => {
      const result = await signedInHook();
      signOut.mockResolvedValueOnce({ error: new Error("network down") });
      await result.current.signOut({ scope: "local" });
      expect(hasCloudSetupMarker("u1")).toBe(true);
    });

    it("clears the marker after a successful local sign-out", async () => {
      const result = await signedInHook();
      await result.current.signOut({ scope: "local" });
      expect(hasCloudSetupMarker("u1")).toBe(false);
    });

    it("keeps the marker for scope others, where this session stays signed in", async () => {
      const result = await signedInHook();
      await result.current.signOut({ scope: "others" });
      expect(hasCloudSetupMarker("u1")).toBe(true);
    });
  });

  describe("tab focus / token refresh", () => {
    it("keeps the same user object and loading=false on TOKEN_REFRESHED", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));

      authStateListeners[0]("SIGNED_IN", { user: { id: "u1" }, access_token: "t1" });
      await waitFor(() => expect(result.current.user?.id).toBe("u1"));
      const userRef = result.current.user;

      authStateListeners[0]("TOKEN_REFRESHED", { user: { id: "u1" }, access_token: "t2" });
      await waitFor(() => expect(result.current.session?.access_token).toBe("t2"));
      expect(result.current.user).toBe(userRef);
      expect(result.current.loading).toBe(false);
    });

    it("keeps the same user object on same-user SIGNED_IN", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));

      authStateListeners[0]("SIGNED_IN", { user: { id: "u1" }, access_token: "t1" });
      await waitFor(() => expect(result.current.user?.id).toBe("u1"));
      const userRef = result.current.user;

      authStateListeners[0]("SIGNED_IN", { user: { id: "u1" }, access_token: "t1" });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.user).toBe(userRef);
    });

    it("updates user on same-id USER_UPDATED when fields change", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(authStateListeners.length).toBeGreaterThan(0));

      authStateListeners[0]("SIGNED_IN", {
        user: { id: "u1", email: "old@example.com", identities: [{ provider: "github" }] },
        access_token: "t1",
      });
      await waitFor(() => expect(result.current.user?.id).toBe("u1"));
      const userRef = result.current.user;

      const updatedUser = {
        id: "u1",
        email: "new@example.com",
        identities: [{ provider: "github" }, { provider: "email" }],
      };
      authStateListeners[0]("USER_UPDATED", { user: updatedUser, access_token: "t1" });

      await waitFor(() => expect(result.current.user?.email).toBe("new@example.com"));
      expect(result.current.user).not.toBe(userRef);
      expect(result.current.user).toEqual(updatedUser);
      expect(result.current.session?.user).toEqual(updatedUser);
      expect(result.current.loading).toBe(false);
    });
  });
});
