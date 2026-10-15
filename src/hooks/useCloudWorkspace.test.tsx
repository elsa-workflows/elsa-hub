import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cloudClient, CLOUD_UPDATING_CODE, CLOUD_UPDATING_MESSAGE } from "@/lib/cloudClient";
import { setCloudStubScenario, STUB_WORKSPACE } from "@/lib/cloudClient/stub";
import {
  cloudWorkspaceView,
  fetchCloudWorkspaces,
  useCloudWorkspace,
} from "./useCloudWorkspace";

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
    vi.restoreAllMocks();
  });

  it("does not bootstrap when opening /cloud with no org", async () => {
    setCloudStubScenario("needsSetup");
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.view.kind).toBe("needsSetup"));
    expect(invoke.mock.calls.map(([body]) => body.action)).toEqual(["listWorkspaces"]);
  });

  it("bootstraps only when setupCloud is called", async () => {
    setCloudStubScenario("needsSetup");
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.view.kind).toBe("needsSetup"));
    result.current.setupCloud();

    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    expect(invoke.mock.calls.map(([body]) => body.action)).toEqual([
      "listWorkspaces",
      "bootstrap",
      "listWorkspaces",
    ]);
  });
});
