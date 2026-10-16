import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cloudClient, type CloudBffRequest, type CloudBffResponse } from "@/lib/cloudClient";
import { setCloudSetupMarker } from "@/lib/cloudClient/setupMarker";
import { useCloudWorkspace } from "./useCloudWorkspace";
import { useEnsureCloudOrganizationLink } from "./useCloudOrganizationLink";

const authState = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  loading: false,
}));

const maybeSingle = vi.hoisted(() =>
  vi.fn(async () => ({ data: null, error: null })),
);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
    }),
  },
}));

const workspace = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Default",
  kind: "cloud",
  role: "owner",
  organizationId: "33333333-3333-4333-8333-333333333333",
  organizationName: "Example",
  organizationRole: "owner",
};

const HUB_ORG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockInvoke(handler: (body: CloudBffRequest) => CloudBffResponse) {
  return vi.spyOn(cloudClient, "invoke").mockImplementation(async (body) => handler(body));
}

function useWorkspaceAndLink(hubOrganizationId: string, isOrgAdmin: boolean) {
  const workspaceState = useCloudWorkspace();
  useEnsureCloudOrganizationLink({
    hubOrganizationId,
    isOrgAdmin,
    setupCloud: workspaceState.setupCloud,
    setupPending: workspaceState.setupPending,
  });
  return workspaceState;
}

describe("useEnsureCloudOrganizationLink", () => {
  afterEach(() => {
    localStorage.clear();
    authState.user = { id: "user-1" };
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: null, error: null });
    vi.restoreAllMocks();
  });

  it("sends bootstrap with hubOrganizationId when the marker is present, the org is unlinked, and the user is an admin", async () => {
    setCloudSetupMarker("user-1");
    maybeSingle.mockResolvedValue({ data: null, error: null });
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

    renderHook(() => useWorkspaceAndLink(HUB_ORG_ID, true), { wrapper });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith({
        action: "bootstrap",
        hubOrganizationId: HUB_ORG_ID,
      });
    });
  });

  it("does not bootstrap when the org already has a link", async () => {
    setCloudSetupMarker("user-1");
    maybeSingle.mockResolvedValue({
      data: {
        hub_organization_id: HUB_ORG_ID,
        control_organization_id: workspace.organizationId,
        validated_at: "2026-10-16T00:00:00Z",
      },
      error: null,
    });
    const invoke = mockInvoke((body) => {
      if (body.action === "listWorkspaces") {
        return { ok: true, state: "ready", workspaces: [workspace] };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });

    renderHook(() => useWorkspaceAndLink(HUB_ORG_ID, true), { wrapper });

    await waitFor(() => expect(invoke).toHaveBeenCalledWith({ action: "listWorkspaces" }));
    expect(invoke.mock.calls.some(([body]) => body.action === "bootstrap")).toBe(false);
  });

  it("does not bootstrap an unlinked org for a non-admin", async () => {
    setCloudSetupMarker("user-1");
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const invoke = mockInvoke((body) => {
      if (body.action === "listWorkspaces") {
        return { ok: true, state: "ready", workspaces: [workspace] };
      }
      return { ok: false, code: "unknown_action", error: "unexpected" };
    });

    renderHook(() => useWorkspaceAndLink(HUB_ORG_ID, false), { wrapper });

    await waitFor(() => expect(invoke).toHaveBeenCalledWith({ action: "listWorkspaces" }));
    expect(invoke.mock.calls.some(([body]) => body.action === "bootstrap")).toBe(false);
  });
});
