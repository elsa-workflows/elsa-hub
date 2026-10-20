import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cloudClient,
  CLOUD_UPDATING_CODE,
  CLOUD_UPDATING_MESSAGE,
  type CloudBffRequest,
  type CloudBffResponse,
  type CloudWorkspace,
} from "@/lib/cloudClient";
import { setCloudSetupMarker } from "@/lib/cloudClient/setupMarker";
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

const workspace: CloudWorkspace = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Default",
  kind: "cloud",
  role: "owner",
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  organizationName: "Example",
  organizationRole: "owner",
};

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

function mockInvoke(handler: (body: CloudBffRequest) => CloudBffResponse) {
  return vi.spyOn(cloudClient, "invoke").mockImplementation(async (body) => handler(body));
}

describe("cloudEngineListView", () => {
  it("is loading while the query is pending", () => {
    expect(cloudEngineListView(undefined, true)).toEqual({ kind: "loading" });
  });

  it("is empty when the BFF returns the empty state", () => {
    const result: CloudBffResponse = {
      ok: true,
      state: "empty",
      workspaceId: workspace.id,
      engines: [],
    };
    expect(cloudEngineListView(result, false)).toEqual({ kind: "empty" });
  });

  it("is a list when engines are present", () => {
    const result: CloudBffResponse = {
      ok: true,
      state: "ready",
      workspaceId: workspace.id,
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
    vi.restoreAllMocks();
  });

  it("lists engines without calling bootstrap", async () => {
    const invoke = mockInvoke((body) => {
      if (body.action === "listEngines") {
        return { ok: true, state: "ready", workspaceId: body.workspaceId, engines: [engine] };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
    const result = await fetchCloudEngines(workspace.id);
    expect(result).toMatchObject({ ok: true, engines: expect.any(Array) });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({
      action: "listEngines",
      workspaceId: workspace.id,
    });
  });
});

describe("useCloudEngines", () => {
  afterEach(() => {
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
    const invoke = mockInvoke((body) => {
      if (body.action === "listWorkspaces") {
        return { ok: true, state: "ready", workspaces: [workspace] };
      }
      if (body.action === "listEngines") {
        return { ok: true, state: "ready", workspaceId: workspace.id, engines: [engine] };
      }
      if (body.action === "onboardingOptions") {
        return {
          ok: false,
          code: "instance_limit_reached",
          error: "You've reached the engine limit for your plan.",
          currentInstances: 1,
          maxInstances: 1,
        };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
    const { result } = renderHook(() => useCloudEngines(), { wrapper });

    await waitFor(() => expect(result.current.view.kind).toBe("list"));
    await waitFor(() => expect(result.current.atLimit).toBe(true));
    expect(result.current.canCreate).toBe(false);
    expect(invoke.mock.calls.map(([body]) => body.action).sort()).toEqual([
      "listEngines",
      "listWorkspaces",
      "onboardingOptions",
    ]);
  });

  it("does not send createEngine when the plan limit is already known", async () => {
    setCloudSetupMarker("user-1");
    const invoke = mockInvoke((body) => {
      if (body.action === "listWorkspaces") {
        return { ok: true, state: "ready", workspaces: [workspace] };
      }
      if (body.action === "listEngines") {
        return { ok: true, state: "ready", workspaceId: workspace.id, engines: [engine] };
      }
      if (body.action === "onboardingOptions") {
        return {
          ok: false,
          code: "instance_limit_reached",
          error: "You've reached the engine limit for your plan.",
        };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
    const { result } = renderHook(() => useCloudEngines(), { wrapper });
    await waitFor(() => expect(result.current.atLimit).toBe(true));
    const created = await result.current.createEngine({
      name: "Second",
      slug: "second",
      intent: {
        release: {
          distributionId: "valence-runtime",
          releaseLine: "3.8",
          requestedVersion: "3.8.4",
          channel: "stable",
          patchUpdates: "automatic-within-minor",
          minorUpdates: "explicit-approval",
          majorMigrations: "explicit-migration",
        },
        application: {
          topologyId: "combined",
          featurePresetId: null,
          featureOverrides: {},
          packagePolicy: null,
          configurationShapeRevisionId: null,
        },
        placement: {
          targetMode: "managed",
          regionCode: "westeurope",
          isolationProfile: "dedicated",
          capacityProfile: "standard-small",
          networkOutcome: "public",
          domainOutcome: "managed",
        },
        desiredLifecycle: "Running",
      },
      idempotencyKey: "44444444-4444-4444-4444-444444444444",
    });
    expect(created).toMatchObject({ code: "instance_limit_reached" });
    expect(invoke.mock.calls.map(([body]) => body.action)).not.toContain("createEngine");
  });
});
