import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cloudClient } from "@/lib/cloudClient";
import { CLOUD_ACCOUNT_LINK_CONFLICT, CLOUD_ACCOUNT_LINK_HAS_ENGINES } from "@/lib/cloud";

const auth = vi.hoisted(() => ({
  configured: true,
  token: "cloud-session-token" as string | null,
  signOut: vi.fn(),
}));

vi.mock("@/lib/cloud/cloudAccountAuth", () => ({
  isCloudAccountAuthConfigured: () => auth.configured,
  getCloudAccountAccessToken: async () => auth.token,
  signInCloudAccountOAuth: vi.fn(),
  signInCloudAccountEmail: vi.fn(),
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
    auth.signOut.mockReset();
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
    await act(async () => {
      await result.current.linkAccount();
    });
    expect(result.current.view).toEqual({ kind: "already_linked" });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("shows readable conflict messages and does not treat them as linked", async () => {
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
    expect(CLOUD_ACCOUNT_LINK_CONFLICT.length).toBeGreaterThan(0);
  });

  it("maps reauthentication-required and retries the link once", async () => {
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
    await act(async () => {
      await result.current.retryLink();
    });
    await waitFor(() => expect(result.current.view).toEqual({ kind: "linked" }));
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
