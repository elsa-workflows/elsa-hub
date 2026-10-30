import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  CLOUD_APPLY_RELEASE,
  CLOUD_DELETE_ENGINE,
  CLOUD_ERROR_HEADING,
  CLOUD_LINK_CHECK_ERROR,
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ASK_ADMIN,
  CLOUD_LINK_ORG_ERROR,
  CLOUD_LINK_ORG_UPDATING,
  CLOUD_OPEN_STUDIO,
  CLOUD_PAGE_TITLE,
  CLOUD_RESTART,
  CLOUD_SETUP_ACTION,
  CLOUD_STRUCTURED_LOGS,
  CLOUD_UPDATING_HEADING,
  CLOUD_UPDATING_MESSAGE,
  CLOUD_UPDATING_RETRY,
  type CloudEngineOverview,
} from "@/lib/cloudClient";
import type { CloudOrganizationLinkView } from "@/lib/cloud";
import type { CloudEngineOverviewView } from "@/hooks/useCloudEngineOverview";

const engine: CloudEngineOverview = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Production",
  slug: "production",
  status: "Ready",
  release: "3.8.4",
  health: "Healthy",
  canOpen: true,
  version: 1,
  etag: '"1"',
  organizationId: "33333333-3333-4333-8333-333333333333",
  audience: "https://studio.example",
  redirectUri: "https://studio.example/handoff",
  allowedActions: {
    restart: { allowed: true, reasonCode: null },
    applyRelease: { allowed: true, reasonCode: null },
    open: { allowed: true, reasonCode: null },
    delete: { allowed: true, reasonCode: null },
  },
};

const viewState = vi.hoisted(() => ({
  current: { kind: "loading" } as CloudEngineOverviewView,
  setupCloud: vi.fn(),
  setupPending: false,
  setupStatus: "idle" as "idle" | "pending" | "updating" | "error" | "success",
  setupMessage: undefined as string | undefined,
  refetch: vi.fn(),
  workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspaces: [] as { id: string; name: string }[],
  selectWorkspace: vi.fn(),
  selectedWorkspace: undefined as { id: string; name: string } | undefined,
}));

const lifecycle = vi.hoisted(() => ({
  progress: undefined as undefined | { state: string; currentStage: string | null; startedAt: null; lastUpdatedAt: null; completedAt: null; diagnosticCode: null; stages: { code: string; status: string; startedAt: null; completedAt: null }[] },
  activity: [] as { sequence: number; eventType: string; occurredAt: string; action: null; diagnosticCode: null; severity: string; message: string | null }[],
  releases: [{ releaseLine: "3.8", version: "3.8.5", channel: "stable", changeKind: "patch" }],
  restart: vi.fn(),
  applyRelease: vi.fn(),
  confirmDelete: vi.fn(),
  deleteEngine: vi.fn(),
  openStudio: vi.fn(),
  restarting: false,
  applying: false,
  deleting: false,
  openingStudio: false,
  pollDeleteOperation: vi.fn(),
}));

vi.mock("@/hooks/useCloudEngineOverview", () => ({
  useCloudEngineOverview: () => ({
    view: viewState.current,
    setupCloud: viewState.setupCloud,
    setupPending: viewState.setupPending,
    setupStatus: viewState.setupStatus,
    setupMessage: viewState.setupMessage,
    refetch: viewState.refetch,
    workspaceId: viewState.workspaceId,
    workspaces: viewState.workspaces,
    selectWorkspace: viewState.selectWorkspace,
    selectedWorkspace: viewState.selectedWorkspace,
  }),
}));

vi.mock("@/hooks/useCloudEngineLifecycle", () => ({
  useCloudEngineLifecycle: () => lifecycle,
}));

const compatibilityState = vi.hoisted(() => ({
  updating: false,
  message: undefined as string | undefined,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useCloudCompatibility", () => ({
  useCloudCompatibility: () => ({
    updating: compatibilityState.updating,
    compatible: !compatibilityState.updating,
    message: compatibilityState.message,
    view: compatibilityState.updating
      ? { kind: "updating" as const, message: compatibilityState.message ?? CLOUD_UPDATING_MESSAGE }
      : { kind: "compatible" as const },
    refetch: compatibilityState.refetch,
  }),
}));

const HUB_ORG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const orgState = vi.hoisted(() => ({
  organizations: [{ slug: "acme", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }] as {
    slug: string;
    id: string;
  }[],
  loading: false,
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => orgState,
}));

const orgLinkState = vi.hoisted(() => ({
  current: { kind: "idle" } as CloudOrganizationLinkView,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useCloudOrganizationLink", () => ({
  useCloudOrganizationLinkView: () => ({
    ...orgLinkState.current,
    refetch: orgLinkState.refetch,
  }),
}));

import CloudEngineOverviewPage from "./CloudEngineOverview";

function renderOverview() {
  return render(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={["/dashboard/org/acme/cloud/engines/11111111-1111-4111-8111-111111111111"]}
      >
        <Routes>
          <Route
            path="/dashboard/org/:slug/cloud/engines/:engineId"
            element={<CloudEngineOverviewPage />}
          />
          <Route path="/dashboard/org/:slug/cloud" element={<p>cloud home</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("CloudEngineOverview", () => {
  afterEach(() => {
    document.querySelectorAll("meta[name='robots']").forEach((node) => node.remove());
    viewState.setupCloud.mockReset();
    viewState.refetch.mockReset();
    viewState.setupPending = false;
    viewState.setupStatus = "idle";
    viewState.setupMessage = undefined;
    Object.values(lifecycle).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) value.mockReset();
    });
    orgState.organizations = [{ slug: "acme", id: HUB_ORG_ID }];
    orgLinkState.current = { kind: "idle" };
    orgLinkState.refetch.mockReset();
    compatibilityState.updating = false;
    compatibilityState.message = undefined;
    compatibilityState.refetch.mockReset();
  });

  it("shows overview actions for a Ready engine", () => {
    viewState.current = { kind: "ready", engine };
    renderOverview();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("3.8.4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Back to ${CLOUD_PAGE_TITLE}` })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
    expect(screen.getByRole("button", { name: CLOUD_OPEN_STUDIO })).toBeEnabled();
    expect(screen.getByRole("link", { name: CLOUD_STRUCTURED_LOGS })).toHaveAttribute("href", "#structured-logs");
    expect(screen.getByRole("button", { name: CLOUD_RESTART })).toBeEnabled();
    expect(screen.getByRole("button", { name: CLOUD_APPLY_RELEASE })).toBeEnabled();
    expect(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE })).toBeEnabled();
  });

  it("disables actions when allowedActions forbids them", () => {
    viewState.current = {
      kind: "ready",
      engine: {
        ...engine,
        allowedActions: {
          restart: { allowed: false, reasonCode: "not-ready" },
          applyRelease: { allowed: false, reasonCode: "not-ready" },
          open: { allowed: false, reasonCode: "not-ready" },
          delete: { allowed: false, reasonCode: "not-ready" },
        },
      },
    };
    renderOverview();
    expect(screen.getByRole("button", { name: CLOUD_OPEN_STUDIO })).toBeDisabled();
    expect(screen.getByRole("button", { name: CLOUD_RESTART })).toBeDisabled();
    expect(screen.getByRole("button", { name: CLOUD_APPLY_RELEASE })).toBeDisabled();
    expect(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE })).toBeDisabled();
  });

  it("disables actions in the updating state without retrying them", () => {
    viewState.current = { kind: "updating", message: CLOUD_UPDATING_MESSAGE };
    renderOverview();
    expect(screen.getByText(CLOUD_UPDATING_HEADING)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_RESTART })).not.toBeInTheDocument();
    expect(lifecycle.restart).not.toHaveBeenCalled();
    expect(lifecycle.applyRelease).not.toHaveBeenCalled();
    expect(lifecycle.deleteEngine).not.toHaveBeenCalled();
  });

  it("keeps the overview visible and disables mutations when compatibility is updating", () => {
    viewState.current = { kind: "ready", engine };
    compatibilityState.updating = true;
    compatibilityState.message = CLOUD_UPDATING_MESSAGE;
    renderOverview();
    expect(screen.getByText(CLOUD_UPDATING_HEADING)).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CLOUD_OPEN_STUDIO })).toBeDisabled();
    expect(screen.getByRole("button", { name: CLOUD_RESTART })).toBeDisabled();
    expect(screen.getByRole("button", { name: CLOUD_APPLY_RELEASE })).toBeDisabled();
    expect(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE })).toBeDisabled();
    expect(lifecycle.restart).not.toHaveBeenCalled();
    expect(lifecycle.applyRelease).not.toHaveBeenCalled();
    expect(lifecycle.deleteEngine).not.toHaveBeenCalled();
    expect(lifecycle.openStudio).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_UPDATING_RETRY }));
    expect(compatibilityState.refetch).toHaveBeenCalled();
    expect(viewState.refetch).toHaveBeenCalled();
  });

  it("recovers mutation controls after the next successful compatibility read", () => {
    viewState.current = { kind: "ready", engine };
    compatibilityState.updating = true;
    compatibilityState.message = CLOUD_UPDATING_MESSAGE;
    const { rerender } = renderOverview();
    expect(screen.getByRole("button", { name: CLOUD_RESTART })).toBeDisabled();

    compatibilityState.updating = false;
    compatibilityState.message = undefined;
    rerender(
      <HelmetProvider>
        <MemoryRouter
          initialEntries={["/dashboard/org/acme/cloud/engines/11111111-1111-4111-8111-111111111111"]}
        >
          <Routes>
            <Route
              path="/dashboard/org/:slug/cloud/engines/:engineId"
              element={<CloudEngineOverviewPage />}
            />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByRole("button", { name: CLOUD_RESTART })).toBeEnabled();
    expect(screen.getByRole("button", { name: CLOUD_OPEN_STUDIO })).toBeEnabled();
    expect(screen.queryByText(CLOUD_UPDATING_HEADING)).not.toBeInTheDocument();
  });

  it("shows the updating state and is noindex", async () => {
    viewState.current = { kind: "updating", message: CLOUD_UPDATING_MESSAGE };
    renderOverview();
    expect(screen.getByText(CLOUD_UPDATING_HEADING)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector("meta[name='robots']")?.getAttribute("content")).toBe(
        "noindex,nofollow",
      );
    });
  });

  it("shows a separate error state, not the updating banner", () => {
    viewState.current = { kind: "error", message: "This workspace is not available." };
    renderOverview();
    expect(screen.getByText(CLOUD_ERROR_HEADING)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_UPDATING_HEADING)).not.toBeInTheDocument();
  });

  it("can set up Elsa Cloud from an overview without an org", () => {
    viewState.current = { kind: "needsSetup" };
    renderOverview();
    expect(screen.getByRole("button", { name: CLOUD_SETUP_ACTION })).toBeInTheDocument();
  });

  it("shows Link this organization when a ready engine exists but the org has no validated link", () => {
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = { kind: "ready", engine };
    renderOverview();
    expect(screen.queryByRole("button", { name: CLOUD_OPEN_STUDIO })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_LINK_ORG_ACTION }));
    expect(viewState.setupCloud).toHaveBeenCalledWith(HUB_ORG_ID);
  });

  it("shows the bootstrap updating copy on the link card instead of the console", () => {
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = { kind: "ready", engine };
    viewState.setupStatus = "updating";
    viewState.setupMessage = CLOUD_LINK_ORG_UPDATING;
    renderOverview();
    expect(screen.getByText(CLOUD_LINK_ORG_UPDATING)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_OPEN_STUDIO })).not.toBeInTheDocument();
  });

  it("shows Retry when linking from overview returns 401 or 403", () => {
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = { kind: "ready", engine };
    viewState.setupStatus = "error";
    viewState.setupMessage = CLOUD_LINK_ORG_ERROR;
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(viewState.setupCloud).toHaveBeenCalledWith(HUB_ORG_ID);
  });

  it("asks a member to wait for an admin when the org is unlinked", () => {
    orgLinkState.current = { kind: "needsLink", canLink: false };
    viewState.current = { kind: "ready", engine };
    renderOverview();
    expect(screen.getByText(CLOUD_LINK_ORG_ASK_ADMIN)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_LINK_ORG_ACTION })).not.toBeInTheDocument();
    expect(viewState.setupCloud).not.toHaveBeenCalled();
  });

  it("shows a retryable error when the link check fails", () => {
    orgLinkState.current = { kind: "error" };
    viewState.current = { kind: "ready", engine };
    renderOverview();
    expect(screen.getByText(CLOUD_ERROR_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_LINK_CHECK_ERROR)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_OPEN_STUDIO })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(orgLinkState.refetch).toHaveBeenCalled();
  });

  it("keeps the delete dialog open until the action resolves and shows errors", async () => {
    viewState.current = { kind: "ready", engine };
    lifecycle.confirmDelete.mockResolvedValue({
      ok: true,
      confirmation: {
        id: "66666666-6666-6666-6666-666666666666",
        expiresAt: "2026-10-15T01:00:00Z",
        billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
      },
    });
    lifecycle.deleteEngine.mockResolvedValue({
      ok: false,
      code: "invalid_request",
      error: "Delete failed.",
    });
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    const confirm = screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1);
    fireEvent.click(confirm!);
    await waitFor(() => expect(lifecycle.deleteEngine).toHaveBeenCalled());
    expect(screen.getByText("Delete failed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /delete this engine/i })).toBeInTheDocument();
  });

  it("runs confirmed delete through to a terminal operation", async () => {
    viewState.current = { kind: "ready", engine };
    lifecycle.confirmDelete.mockResolvedValue({
      ok: true,
      confirmation: {
        id: "66666666-6666-6666-6666-666666666666",
        expiresAt: "2026-10-15T01:00:00Z",
        billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
      },
    });
    lifecycle.deleteEngine.mockResolvedValue({
      ok: true,
      operation: { id: "55555555-5555-5555-5555-555555555555", action: "Delete", state: "Accepted" },
    });
    lifecycle.pollDeleteOperation.mockResolvedValue({
      ok: true,
      operation: { id: "55555555-5555-5555-5555-555555555555", action: "Delete", state: "Succeeded" },
    });
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await waitFor(() => expect(lifecycle.confirmDelete).toHaveBeenCalled());
    const confirm = screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1);
    fireEvent.click(confirm!);
    await waitFor(() => expect(lifecycle.deleteEngine).toHaveBeenCalled());
    expect(lifecycle.pollDeleteOperation).toHaveBeenCalled();
  });
});
