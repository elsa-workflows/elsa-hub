import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cloudClient,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  type CloudBffResponse,
} from "@/lib/cloudClient";
import { setCloudSetupMarker } from "@/lib/cloudClient/setupMarker";
import { setCloudStubScenario, STUB_WORKSPACE } from "@/lib/cloudClient/stub";
import {
  cloudEngineListView,
  fetchCloudEngines,
  resolveCloudEngineListView,
  useCloudEngines,
} from "./useCloudEngines";

const authState = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

const engine = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Production",
  slug: "production",
  status: "Ready",
  release: "3.8.4",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("cloudEngineListView", () => {
  it("is loading while the query is pending", () => {
    expect(cloudEngineListView(undefined, true)).toEqual({ kind: "loading" });
  });

  it("is empty when the BFF returns the empty state", () => {
    const result: CloudBffResponse = {
      ok: true,
      state: "empty",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      engines: [],
    };
    expect(cloudEngineListView(result, false)).toEqual({ kind: "empty" });
  });

  it("is a list when engines are present", () => {
    const result: CloudBffResponse = {
      ok: true,
      state: "ready",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      engines: [engine],
    };
    expect(cloudEngineListView(result, false)).toEqual({
      kind: "list",
      engines: [engine],
    });
  });

  it("is updating when Control reports an in-progress update", () => {
    const result: CloudBffResponse = {
      ok: false,
      state: "updating",
      code: CLOUD_UPDATING_CODE,
      error: CLOUD_UPDATING_MESSAGE,
    };
    expect(cloudEngineListView(result, false)).toEqual({
      kind: "updating",
      message: CLOUD_UPDATING_MESSAGE,
    });
  });

  it("is an error for forbidden, not the updating banner", () => {
    expect(
      cloudEngineListView(
        { ok: false, code: "forbidden", error: "This workspace is not available." },
        false,
      ),
    ).toEqual({ kind: "error", message: "This workspace is not available." });
  });
});

describe("resolveCloudEngineListView", () => {
  it("surfaces needsSetup from the shared workspace query", () => {
    expect(resolveCloudEngineListView({ kind: "needsSetup" }, undefined, false)).toEqual({
      kind: "needsSetup",
    });
  });
});

describe("fetchCloudEngines", () => {
  afterEach(() => {
    setCloudStubScenario("list");
    vi.restoreAllMocks();
  });

  it("lists engines without calling bootstrap", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke");
    const result = await fetchCloudEngines(STUB_WORKSPACE.id);
    expect(result).toMatchObject({ ok: true, engines: expect.any(Array) });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({
      action: "listEngines",
      workspaceId: STUB_WORKSPACE.id,
    });
  });
});

describe("useCloudEngines", () => {
  afterEach(() => {
    setCloudStubScenario("list");
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("makes zero cloud-bff calls when opening /cloud with no setup marker", async () => {
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudEngines(), { wrapper });

    expect(result.current.view.kind).toBe("needsSetup");
    await waitFor(() => expect(invoke).not.toHaveBeenCalled());
  });

  it("lists engines after the setup marker is present", async () => {
    setCloudSetupMarker("user-1");
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudEngines(), { wrapper });

    await waitFor(() => expect(result.current.view.kind).toBe("list"));
    expect(invoke.mock.calls.map(([body]) => body.action)).toEqual([
      "listWorkspaces",
      "listEngines",
    ]);
  });
});
