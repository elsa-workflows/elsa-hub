import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cloudClient, CLOUD_UPDATING_CODE, CLOUD_UPDATING_MESSAGE } from "@/lib/cloudClient";
import {
  hasCloudSetupMarker,
  setCloudSetupMarker,
} from "@/lib/cloudClient/setupMarker";
import { setCloudStubScenario, STUB_WORKSPACE } from "@/lib/cloudClient/stub";
import { cloudWorkspaceView, fetchCloudWorkspaces, useCloudWorkspace } from "./useCloudWorkspace";

const authState = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("cloudWorkspaceView", () => {
  it("is needsSetup when there are no workspaces", () => {
    expect(
      cloudWorkspaceView({ ok: true, state: "ready", workspaces: [] }, false),
    ).toEqual({ kind: "needsSetup" });
  });

  it("is ready when a workspace exists", () => {
    expect(
      cloudWorkspaceView({ ok: true, state: "ready", workspaces: [STUB_WORKSPACE] }, false),
    ).toEqual({ kind: "ready", workspace: STUB_WORKSPACE });
  });

  it("picks the owner-org workspace the way Control bootstrap does", () => {
    const other = {
      ...STUB_WORKSPACE,
      id: "ws-other",
      organizationId: "org-other",
      organizationRole: "member",
      role: "member",
    };
    expect(
      cloudWorkspaceView({ ok: true, state: "ready", workspaces: [other, STUB_WORKSPACE] }, false),
    ).toEqual({ kind: "ready", workspace: STUB_WORKSPACE });
  });

  it("is an error, not updating, for forbidden", () => {
    expect(
      cloudWorkspaceView(
        { ok: false, code: "forbidden", error: "This workspace is not available." },
        false,
      ),
    ).toEqual({ kind: "error", message: "This workspace is not available." });
  });

  it("is updating for the Control envelope", () => {
    expect(
      cloudWorkspaceView(
        {
          ok: false,
          state: "updating",
          code: CLOUD_UPDATING_CODE,
          error: CLOUD_UPDATING_MESSAGE,
        },
        false,
      ),
    ).toEqual({ kind: "updating", message: CLOUD_UPDATING_MESSAGE });
  });
});

describe("fetchCloudWorkspaces", () => {
  afterEach(() => {
    setCloudStubScenario("list");
    vi.restoreAllMocks();
  });

  it("only calls listWorkspaces and never bootstrap", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke");
    setCloudStubScenario("needsSetup");
    const result = await fetchCloudWorkspaces();
    expect(result).toMatchObject({ ok: true, workspaces: [] });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({ action: "listWorkspaces" });
  });
});

describe("useCloudWorkspace", () => {
  afterEach(() => {
    setCloudStubScenario("list");
    localStorage.clear();
    authState.user = { id: "user-1" };
    vi.restoreAllMocks();
  });

  it("makes zero cloud-bff or provisioning calls when no setup marker exists", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudWorkspace(), { wrapper });

    expect(result.current.view.kind).toBe("needsSetup");
    await waitFor(() => expect(invoke).not.toHaveBeenCalled());
    expect(invoke).not.toHaveBeenCalled();
  });

  it("loads workspaces directly when the setup marker is present", async () => {
    setCloudSetupMarker("user-1");
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    expect(result.current.view).toMatchObject({
      kind: "ready",
      workspace: { id: STUB_WORKSPACE.id },
    });
    expect(invoke.mock.calls.map(([body]) => body.action)).toEqual(["listWorkspaces"]);
  });

  it("bootstraps only when setupCloud is called, then sets the marker", async () => {
    setCloudStubScenario("needsSetup");
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudWorkspace(), { wrapper });

    expect(result.current.view.kind).toBe("needsSetup");
    expect(invoke).not.toHaveBeenCalled();
    result.current.setupCloud();

    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    expect(hasCloudSetupMarker("user-1")).toBe(true);
    expect(invoke.mock.calls.map(([body]) => body.action)).toEqual([
      "bootstrap",
      "listWorkspaces",
    ]);
  });
});
