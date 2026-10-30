import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ACCOUNT_LINK_AUTO_RETRY_KEY } from "@/lib/cloud/accountLink";
import { CLOUD_ACCOUNT_LINK_CONFLICT, CLOUD_ACCOUNT_LINK_HAS_ENGINES } from "@/lib/cloud";
import { CLOUD_ACCOUNT_LINK_SIGNIN_FAILED } from "@/lib/cloudClient";
import { cloudClient } from "@/lib/cloudClient";

const auth = vi.hoisted(() => ({
  configured: true,
  token: "cloud-session-token" as string | null,
  hubUserId: "hub-user-1" as string | null,
  signOut: vi.fn(),
  signInOAuth: vi.fn(),
  signInEmail: vi.fn(),
}));

const startHubReauth = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: auth.hubUserId ? { id: auth.hubUserId } : null, loading: false }),
}));

vi.mock("@/lib/cloudPaths", () => ({
  useCloudConsolePaths: () => ({ link: "/dashboard/org/acme/cloud/link" }),
}));

vi.mock("@/lib/cloud/accountLink", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloud/accountLink")>();
  return { ...actual, startHubReauth };
});

vi.mock("@/lib/cloud/cloudAccountAuth", () => ({
  isCloudAccountAuthConfigured: () => auth.configured,
  getCloudAccountAccessToken: async () => auth.token,
  signInCloudAccountOAuth: (...args: unknown[]) => auth.signInOAuth(...args),
  signInCloudAccountEmail: (...args: unknown[]) => auth.signInEmail(...args),
  signOutCloudAccount: () => auth.signOut(),
}));

import { useCloudAccountLink } from "./useCloudAccountLink";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

describe("useCloudAccountLink", () => {
  afterEach(() => {
    sessionStorage.clear();
    auth.configured = true;
    auth.token = "cloud-session-token";
    auth.hubUserId = "hub-user-1";
    auth.signOut.mockReset();
    auth.signInOAuth.mockReset();
    auth.signInEmail.mockReset();
    startHubReauth.mockReset();
    vi.restoreAllMocks();
  });

  it("links once and then reports already linked", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke")
      .mockResolvedValueOnce({
        ok: true,
        state: "linked",
        accountId: "77777777-7777-4777-8777-777777777777",
      })
      .mockResolvedValueOnce({
        ok: true,
        state: "already_linked",
        accountId: "77777777-7777-4777-8777-777777777777",
      });
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view).toEqual({ kind: "linked" });
    expect(auth.signOut).toHaveBeenCalled();
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view).toEqual({ kind: "already_linked" });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("shows readable conflict messages and does not treat them as linked", async () => {
    sessionStorage.setItem("elsa.cloud.account-link.retry", "1");
    vi.spyOn(cloudClient, "invoke").mockResolvedValue({
      ok: false,
      code: "hub_account_has_engines",
      error: CLOUD_ACCOUNT_LINK_HAS_ENGINES,
    });
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view).toEqual({
      kind: "conflict",
      message: CLOUD_ACCOUNT_LINK_HAS_ENGINES,
    });
    expect(auth.signOut).toHaveBeenCalled();
    expect(sessionStorage.getItem("elsa.cloud.account-link.retry")).toBeNull();
    expect(CLOUD_ACCOUNT_LINK_CONFLICT.length).toBeGreaterThan(0);
  });

  it("resets the retry-once flag on a non-reauth error outcome", async () => {
    sessionStorage.setItem("elsa.cloud.account-link.retry", "1");
    sessionStorage.setItem(ACCOUNT_LINK_AUTO_RETRY_KEY, "1");
    vi.spyOn(cloudClient, "invoke").mockResolvedValue({
      ok: false,
      code: "sessions_required",
      error: "Sign in to Elsa Cloud and the Hub, then try again.",
    });
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view.kind).toBe("error");
    expect(sessionStorage.getItem("elsa.cloud.account-link.retry")).toBeNull();
    expect(sessionStorage.getItem(ACCOUNT_LINK_AUTO_RETRY_KEY)).toBeNull();
  });

  it("maps a stale Cloud session and retries the link once after Cloud sign-in", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke")
      .mockResolvedValueOnce({
        ok: false,
        code: "reauthentication_required",
        error: "Sign in again to continue linking.",
        staleSession: "cloud",
      })
      .mockResolvedValueOnce({
        ok: true,
        state: "linked",
        accountId: "77777777-7777-4777-8777-777777777777",
      });
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view.kind).toBe("reauth");
    expect(auth.signOut).toHaveBeenCalled();
    expect(startHubReauth).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.retryLink();
    });
    await waitFor(() => expect(result.current.view).toEqual({ kind: "linked" }));
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("re-runs Hub sign-in when the Hub session is stale, then retries the link once", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke")
      .mockResolvedValueOnce({
        ok: false,
        code: "reauthentication_required",
        error: "Sign in again to continue linking.",
        staleSession: "hub",
      })
      .mockResolvedValueOnce({
        ok: true,
        state: "linked",
        accountId: "77777777-7777-4777-8777-777777777777",
      });
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view.kind).toBe("reauth");
    expect(startHubReauth).toHaveBeenCalledWith("/dashboard/org/acme/cloud/link");
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledTimes(1);

    sessionStorage.setItem(ACCOUNT_LINK_AUTO_RETRY_KEY, "1");
    await act(async () => {
      await result.current.refreshCloudSession();
    });
    await waitFor(() => expect(result.current.view).toEqual({ kind: "linked" }));
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("re-runs Hub sign-in first when both sessions are stale", async () => {
    vi.spyOn(cloudClient, "invoke").mockResolvedValue({
      ok: false,
      code: "reauthentication_required",
      error: "Sign in again to continue linking.",
      staleSession: "both",
    });
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view.kind).toBe("reauth");
    expect(auth.signOut).toHaveBeenCalled();
    expect(startHubReauth).toHaveBeenCalledWith("/dashboard/org/acme/cloud/link");
  });

  it("surfaces Elsa Cloud sign-in failures", async () => {
    auth.signInEmail.mockRejectedValueOnce(new Error("Invalid login credentials"));
    const { result } = renderHook(() => useCloudAccountLink(), { wrapper });
    await act(async () => {
      await result.current.signInEmail("user@example.com", "wrong");
    });
    expect(result.current.view).toEqual({
      kind: "error",
      message: CLOUD_ACCOUNT_LINK_SIGNIN_FAILED,
    });
    expect(auth.signInEmail).toHaveBeenCalledWith("user@example.com", "wrong", "hub-user-1");

    auth.signInOAuth.mockRejectedValueOnce(new Error("provider disabled"));
    await act(async () => {
      await result.current.signInOAuth("azure");
    });
    expect(result.current.view).toEqual({
      kind: "error",
      message: CLOUD_ACCOUNT_LINK_SIGNIN_FAILED,
    });
    expect(auth.signInOAuth).toHaveBeenCalledWith("azure", "hub-user-1");
  });
});
