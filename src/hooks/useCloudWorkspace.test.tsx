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
import {
  hasCloudSetupMarker,
  setCloudSetupMarker,
} from "@/lib/cloudClient/setupMarker";
import {
  cloudWorkspaceView,
  fetchCloudWorkspaces,
  pickCloudWorkspace,
  useCloudWorkspace,
} from "./useCloudWorkspace";

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

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockInvoke(handler: (body: CloudBffRequest) => CloudBffResponse) {
  return vi.spyOn(cloudClient, "invoke").mockImplementation(async (body) => handler(body));
}

describe("cloudWorkspaceView", () => {
  it("is needsSetup when there are no workspaces", () => {
    expect(
      cloudWorkspaceView({ ok: true, state: "ready", workspaces: [] }, false),
    ).toEqual({ kind: "needsSetup" });
  });

  it("is ready when a workspace exists", () => {
    expect(
      cloudWorkspaceView({ ok: true, state: "ready", workspaces: [workspace] }, false),
    ).toEqual({ kind: "ready", workspace });
  });

  it("keeps an explicit workspace selection when it is still in the list", () => {
    const other = {
      ...workspace,
      id: "ws-other",
      organizationId: "org-other",
      organizationRole: "member",
      role: "member",
    };
    expect(pickCloudWorkspace([other, workspace], other.id)).toEqual(other);
    expect(pickCloudWorkspace([other, workspace], "missing")).toEqual(workspace);
  });

  it("picks the owner-org workspace the way Control bootstrap does", () => {
    const other = {
      ...workspace,
      id: "ws-other",
      organizationId: "org-other",
      organizationRole: "member",
      role: "member",
    };
    expect(
      cloudWorkspaceView({ ok: true, state: "ready", workspaces: [other, workspace] }, false),
    ).toEqual({ kind: "ready", workspace });
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
    vi.restoreAllMocks();
  });

  it("only calls listWorkspaces and never bootstrap", async () => {
    const invoke = mockInvoke(() => ({ ok: true, state: "ready", workspaces: [] }));
    const result = await fetchCloudWorkspaces();
    expect(result).toMatchObject({ ok: true, workspaces: [] });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith({ action: "listWorkspaces" });
  });
});

describe("useCloudWorkspace", () => {
  afterEach(() => {
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
    const invoke = mockInvoke((body) => {
      if (body.action === "listWorkspaces") {
        return { ok: true, state: "ready", workspaces: [workspace] };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
    const { result } = renderHook(() => useCloudWorkspace(), { wrapper });

    await waitFor(() => expect(result.current.view.kind).toBe("ready"));
    expect(result.current.view).toMatchObject({
      kind: "ready",
      workspace: { id: workspace.id },
    });
    expect(invoke.mock.calls.map(([body]) => body.action)).toEqual(["listWorkspaces"]);
  });

  it("bootstraps only when setupCloud is called, then sets the marker", async () => {
    const invoke = mockInvoke((body) => {
      if (body.action === "bootstrap") {
        return {
          ok: true,
          state: "ready",
          organizationId: workspace.organizationId,
          workspaceId: workspace.id,
        };
      }
      if (body.action === "listWorkspaces") {
        return { ok: true, state: "ready", workspaces: [workspace] };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });
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
