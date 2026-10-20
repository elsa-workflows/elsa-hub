import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cloudClient } from "@/lib/cloudClient";
import { setCloudSetupMarker } from "@/lib/cloudClient/setupMarker";
import { useCloudOrganizationLinkView } from "./useCloudOrganizationLink";

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

const HUB_ORG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCloudOrganizationLinkView", () => {
  afterEach(() => {
    localStorage.clear();
    authState.user = { id: "user-1" };
    maybeSingle.mockReset();
    maybeSingle.mockResolvedValue({ data: null, error: null });
    vi.restoreAllMocks();
  });

  it("is idle without a Hub org and does not query", () => {
    const { result } = renderHook(() => useCloudOrganizationLinkView(undefined, true), { wrapper });
    expect(result.current).toMatchObject({ kind: "idle" });
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("is pending while the link row is loading", () => {
    maybeSingle.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useCloudOrganizationLinkView(HUB_ORG_ID, true), { wrapper });
    expect(result.current).toMatchObject({ kind: "pending" });
  });

  it("is linked when a validated row exists", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        hub_organization_id: HUB_ORG_ID,
        control_organization_id: "33333333-3333-4333-8333-333333333333",
        validated_at: "2026-10-16T00:00:00Z",
      },
      error: null,
    });
    const { result } = renderHook(() => useCloudOrganizationLinkView(HUB_ORG_ID, true), { wrapper });
    await waitFor(() => expect(result.current).toMatchObject({ kind: "linked" }));
  });

  it("needs a link for an unlinked org even when the setup marker is present", async () => {
    setCloudSetupMarker("user-1");
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudOrganizationLinkView(HUB_ORG_ID, true), { wrapper });
    await waitFor(() => expect(result.current).toMatchObject({ kind: "needsLink", canLink: true }));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not let a member link an unlinked org", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const invoke = vi.spyOn(cloudClient, "invoke");
    const { result } = renderHook(() => useCloudOrganizationLinkView(HUB_ORG_ID, false), { wrapper });
    await waitFor(() => expect(result.current).toMatchObject({ kind: "needsLink", canLink: false }));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("is an error when the link check fails and does not treat the org as unlinked", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "db down" } });
    const { result } = renderHook(() => useCloudOrganizationLinkView(HUB_ORG_ID, true), { wrapper });
    await waitFor(() => expect(result.current).toMatchObject({ kind: "error" }));
  });
});
