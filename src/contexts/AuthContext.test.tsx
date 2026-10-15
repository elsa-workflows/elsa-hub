import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const signInWithOAuth = vi.fn(async (_args?: unknown) => ({ error: null }));
const signInWithOtp = vi.fn(async (_args?: unknown) => ({ error: null }));
const signUp = vi.fn(async (_args?: unknown) => ({ error: null }));
const refreshSession = vi.fn(async () => ({ error: null }));
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
      signOut: async () => ({ error: null }),
      refreshSession: () => refreshSession(),
    },
  },
}));

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
    authStateListeners.length = 0;
    sessionStorage.clear();
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

  async function expectConfirmPathSkipsRedirect(pathname: string) {
    sessionStorage.setItem("authRedirect", "/dashboard/org/acme");
    let assigned = "";
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
        origin: original.origin,
        pathname,
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
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(assigned).toBe("");
    expect(sessionStorage.getItem("authRedirect")).toBe("/dashboard/org/acme");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  }

  it("does not consume the stored redirect on SIGNED_IN while /auth/confirm is open", async () => {
    await expectConfirmPathSkipsRedirect("/auth/confirm");
  });

  it("treats /auth/confirm/ as the confirm page when skipping the SIGNED_IN redirect", async () => {
    await expectConfirmPathSkipsRedirect("/auth/confirm/");
  });

  it("does not call refreshSession from onAuthStateChange", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    authStateListeners[0]("SIGNED_IN", { user: { id: "u1" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
