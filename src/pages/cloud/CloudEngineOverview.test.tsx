import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  CLOUD_APPLY_RELEASE,
  CLOUD_DELETE_ENGINE,
  CLOUD_DELETE_CHANGED_SINCE_READ,
  CLOUD_DELETE_CONFIRMATION_EXPIRED,
  CLOUD_DELETE_IN_PROGRESS,
  CLOUD_DELETE_START_ERROR,
  CLOUD_RESTART_CONFIRM,
  CLOUD_ERROR_HEADING,
  CLOUD_LINK_CHECK_ERROR,
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ERROR,
  CLOUD_LINK_ORG_HEADING,
  CLOUD_LINK_ORG_MESSAGE,
  CLOUD_LINK_ORG_NOT_CONNECTED,
  CLOUD_LINK_ORG_UNREACHABLE,
  CLOUD_OPEN_STUDIO,
  CLOUD_PAGE_TITLE,
  CLOUD_RESTART,
  CLOUD_SETUP_ACTION,
  CLOUD_STRUCTURED_LOGS,
  CLOUD_UNREACHABLE_HEADING,
  CLOUD_UPDATING_MESSAGE,
  CLOUD_UPDATING_RETRY,
  type CloudEngineOverview,
} from "@/lib/cloudClient";
import type { CloudOrganizationLinkView } from "@/lib/cloud";
import {
  readDeletionHistory,
  readPersistedDeletionHistory,
  upsertDeletionHistoryRecord,
  resetDeletionHistoryStore,
} from "@/lib/cloud/deletionHistoryStore";
import {
  UNFINISHED_DELETE_STATE_DELETING,
  UNFINISHED_DELETE_STATE_UNAVAILABLE,
  unfinishedDeleteStateLabel,
} from "@/lib/cloud/managedEngineDeletionHistory";
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

const { toastMessage, toastSuccess } = vi.hoisted(() => ({ toastMessage: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("sonner", () => ({ toast: { message: toastMessage, success: toastSuccess, error: vi.fn() } }));

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

const billingState = vi.hoisted(() => ({
  billingAccount: "missing" as "missing" | "linked",
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock("@/hooks/useCloudBilling", () => ({
  useCloudBilling: () => ({
    billingAccount: billingState.billingAccount,
    openPortal: { isPending: billingState.isPending, mutate: billingState.mutate },
  }),
}));

import CloudEngineOverviewPage from "./CloudEngineOverview";
import { setCloudSignedCopyEnabledForTests } from "@/lib/cloudClient/signedCopyFlag";
import { cloudEngineDeletingToast, cloudEngineDeletedToast, CLOUD_DELETED_BANNER_HEADING, CLOUD_DELETED_BANNER_SECOND_LINE, CLOUD_REASON_GENERIC_FALLBACK, CLOUD_REASON_DELETING_BODY, CLOUD_STATUS_SETUP_STOPPED, CLOUD_DELETE_START_FALLBACK, CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT, CLOUD_ACTION_DELETE_CONFIRMATION_INVALID, CLOUD_ACTION_CHANGED_SINCE_READ, CLOUD_ACTION_CHANGE_IN_PROGRESS } from "@/lib/cloudClient/signedCopy";
import {
  controlDeletedOverview,
  controlFailedAfterReadyOverview,
  controlFailedSetupOverview,
  controlFailedWithoutOperationOverview,
} from "@/lib/cloud/controlOverview.fixtures";


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


const DELETE_START_ERROR_LINE = CLOUD_DELETE_START_FALLBACK;
const DELETE_IN_PROGRESS_LINE = CLOUD_REASON_DELETE_BLOCKED_IN_FLIGHT;
const DELETE_CONFIRMATION_LINE = CLOUD_ACTION_DELETE_CONFIRMATION_INVALID;
const DELETE_CHANGED_LINE = CLOUD_ACTION_CHANGED_SINCE_READ;

describe("CloudEngineOverview", () => {
  beforeEach(() => setCloudSignedCopyEnabledForTests(true));
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
    resetDeletionHistoryStore();
    localStorage.clear();
    setCloudSignedCopyEnabledForTests(undefined);
    billingState.billingAccount = "missing";
    billingState.isPending = false;
    billingState.mutate.mockReset();
    toastSuccess.mockReset();

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
    expect(screen.getByText(CLOUD_UNREACHABLE_HEADING)).toBeInTheDocument();
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
    expect(screen.getByText(CLOUD_UNREACHABLE_HEADING)).toBeInTheDocument();
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
    expect(screen.queryByText(CLOUD_UNREACHABLE_HEADING)).not.toBeInTheDocument();
  });

  it("shows the updating state and is noindex", async () => {
    viewState.current = { kind: "updating", message: CLOUD_UPDATING_MESSAGE };
    renderOverview();
    expect(screen.getByText(CLOUD_UNREACHABLE_HEADING)).toBeInTheDocument();
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
    expect(screen.queryByText(CLOUD_UNREACHABLE_HEADING)).not.toBeInTheDocument();
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
    viewState.setupMessage = CLOUD_LINK_ORG_UNREACHABLE;
    renderOverview();
    expect(screen.getByText(CLOUD_LINK_ORG_UNREACHABLE)).toBeInTheDocument();
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

  it("tells a non-admin the org is not connected, with no button", () => {
    orgLinkState.current = { kind: "needsLink", canLink: false };
    viewState.current = { kind: "ready", engine };
    renderOverview();
    expect(screen.getByText(CLOUD_LINK_ORG_NOT_CONNECTED)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: CLOUD_PAGE_TITLE })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: CLOUD_LINK_ORG_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByText(CLOUD_LINK_ORG_MESSAGE)).not.toBeInTheDocument();
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
    expect(screen.getByText(DELETE_START_ERROR_LINE)).toBeInTheDocument();
    expect(screen.queryByText("Delete failed.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /delete this engine/i })).toBeInTheDocument();
    expect(readDeletionHistory(viewState.workspaceId)).toEqual([]);
  });

  it("removes the submitting row and shows the signed delete-start error when start fails", async () => {
    viewState.current = { kind: "ready", engine };
    lifecycle.confirmDelete.mockResolvedValue({
      ok: true,
      confirmation: {
        id: "66666666-6666-6666-6666-666666666666",
        expiresAt: "2026-10-15T01:00:00Z",
        billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
      },
    });
    let finishStart!: (value: unknown) => void;
    lifecycle.deleteEngine.mockImplementation(
      () => new Promise((resolve) => {
        finishStart = resolve;
      }),
    );
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => {
      expect(readDeletionHistory(viewState.workspaceId)).toEqual([
        expect.objectContaining({
          phase: "submitting",
          instanceId: engine.id,
          instanceName: engine.name,
        }),
      ]);
    });
    finishStart({
      ok: false,
      code: "invalid_request",
      error: "Delete failed.",
    });
    await waitFor(() => expect(readDeletionHistory(viewState.workspaceId)).toEqual([]));
    expect(screen.getByText(DELETE_START_ERROR_LINE)).toBeInTheDocument();
    expect(screen.queryByText("Delete failed.")).not.toBeInTheDocument();
  });

  it("closes the dialog right after Control accepts the delete and never re-enables Delete mid-submit", async () => {
    viewState.current = { kind: "ready", engine };
    toastMessage.mockClear();
    viewState.refetch.mockClear();
    lifecycle.confirmDelete.mockResolvedValue({
      ok: true,
      confirmation: {
        id: "66666666-6666-6666-6666-666666666666",
        expiresAt: "2026-10-15T01:00:00Z",
        billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
      },
    });
    let accept!: (value: unknown) => void;
    lifecycle.deleteEngine.mockImplementation(() => new Promise((resolve) => {
      accept = resolve;
    }));
    // The status check never finishes during this test (Control can take minutes).
    lifecycle.pollDeleteOperation.mockImplementation(() => new Promise(() => undefined));
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    const confirm = screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(lifecycle.deleteEngine).toHaveBeenCalled());
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    accept({
      ok: true,
      operation: { id: "55555555-5555-5555-5555-555555555555", action: "Delete", state: "Accepted" },
    });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /delete this engine/i })).not.toBeInTheDocument()
    );
    expect(toastMessage).toHaveBeenCalledWith(cloudEngineDeletingToast("Production"));
    expect(lifecycle.pollDeleteOperation).toHaveBeenCalled();
    expect(viewState.refetch).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE })).toBeDisabled();
  });

  async function submitDeleteWith(result: unknown) {
    lifecycle.confirmDelete.mockResolvedValue({
      ok: true,
      confirmation: {
        id: "66666666-6666-6666-6666-666666666666",
        expiresAt: "2026-10-15T01:00:00Z",
        billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
      },
    });
    lifecycle.deleteEngine.mockResolvedValue(result);
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => expect(lifecycle.deleteEngine).toHaveBeenCalled());
  }

  const CONFIRMATION_INVALID = {
    ok: false,
    code: "delete_confirmation_invalid",
    error: "This delete confirmation is no longer valid.",
  };

  it("says the engine is already being deleted when Control reports operation-active", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockClear();
    await submitDeleteWith({
      ok: false,
      code: "delete_in_progress",
      error: "This engine is already being deleted.",
    });
    expect(await screen.findByText(DELETE_IN_PROGRESS_LINE)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_START_ERROR_LINE)).not.toBeInTheDocument();
    expect(screen.queryByText(DELETE_CONFIRMATION_LINE)).not.toBeInTheDocument();
  });

  it("shows the existing changed-since-read line for a 412 changed_since_read delete", async () => {
    viewState.current = { kind: "ready", engine };
    await submitDeleteWith({
      ok: false,
      code: "changed_since_read",
      error: "This engine changed since you opened it.",
    });
    expect(await screen.findByText(DELETE_CHANGED_LINE)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_START_ERROR_LINE)).not.toBeInTheDocument();
  });

  async function submitRestartWith(result: unknown) {
    lifecycle.restart.mockResolvedValue(result);
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_RESTART }));
    await screen.findByRole("heading", { name: CLOUD_RESTART_CONFIRM });
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_RESTART }).at(-1)!);
    await waitFor(() => expect(lifecycle.restart).toHaveBeenCalled());
  }

  it("shows the existing changed-since-read line when restart is refused as changed_since_read", async () => {
    viewState.current = { kind: "ready", engine };
    await submitRestartWith({
      ok: false,
      code: "changed_since_read",
      error: "This engine changed since you opened it.",
    });
    expect(await screen.findByText(DELETE_CHANGED_LINE)).toBeInTheDocument();
  });

  it("shows the signed in-progress line when restart is refused as instance.operation-active", async () => {
    viewState.current = { kind: "ready", engine };
    await submitRestartWith({
      ok: false,
      code: "instance.operation-active",
      error: "The request could not be completed.",
    });
    expect(await screen.findByText(CLOUD_ACTION_CHANGE_IN_PROGRESS)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_IN_PROGRESS_LINE)).not.toBeInTheDocument();
    expect(screen.queryByText(DELETE_START_ERROR_LINE)).not.toBeInTheDocument();
  });

  it("treats an invalid confirmation on a Deleting engine as already being deleted, without a refetch", async () => {
    viewState.current = { kind: "ready", engine: { ...engine, status: "Deleting" } };
    viewState.refetch.mockClear();
    await submitDeleteWith(CONFIRMATION_INVALID);
    expect(await screen.findByText(DELETE_IN_PROGRESS_LINE)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_CONFIRMATION_LINE)).not.toBeInTheDocument();
    expect(viewState.refetch).not.toHaveBeenCalled();
  });

  it("treats an invalid confirmation with a tracked delete operation as already being deleted and keeps the row", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockClear();
    upsertDeletionHistoryRecord(viewState.workspaceId, {
      phase: "tracking",
      instanceId: engine.id,
      instanceName: engine.name,
      operationId: "77777777-7777-7777-7777-777777777777",
      acceptedAt: "2026-11-27T11:57:39Z",
    });
    await submitDeleteWith(CONFIRMATION_INVALID);
    expect(await screen.findByText(DELETE_IN_PROGRESS_LINE)).toBeInTheDocument();
    expect(viewState.refetch).not.toHaveBeenCalled();
    expect(readDeletionHistory(viewState.workspaceId)).toEqual([
      expect.objectContaining({
        phase: "tracking",
        instanceId: engine.id,
        operationId: "77777777-7777-7777-7777-777777777777",
      }),
    ]);
  });

  it("refetches once and says the confirmation expired when the engine is not being deleted", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockReset();
    viewState.refetch.mockResolvedValue({ ok: true, state: "ready", engine });
    await submitDeleteWith(CONFIRMATION_INVALID);
    expect(await screen.findByText(DELETE_CONFIRMATION_LINE)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_IN_PROGRESS_LINE)).not.toBeInTheDocument();
    expect(viewState.refetch).toHaveBeenCalledTimes(1);
  });

  it("after an expired confirmation, fetches a fresh one so a second Delete succeeds without a reload", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockReset();
    viewState.refetch.mockResolvedValue({ ok: true, state: "ready", engine });
    toastMessage.mockClear();
    const FRESH_ID = "88888888-8888-4888-8888-888888888888";
    lifecycle.confirmDelete
      .mockResolvedValueOnce({
        ok: true,
        confirmation: {
          id: "66666666-6666-6666-6666-666666666666",
          expiresAt: "2026-10-15T01:00:00Z",
          billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        confirmation: {
          id: FRESH_ID,
          expiresAt: "2026-11-27T13:30:00Z",
          billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "fresh notice" },
        },
      });
    lifecycle.deleteEngine
      .mockResolvedValueOnce(CONFIRMATION_INVALID)
      .mockResolvedValueOnce({
        ok: true,
        operation: { id: "55555555-5555-5555-5555-555555555555", action: "Delete", state: "Accepted" },
      });
    lifecycle.pollDeleteOperation.mockImplementation(() => new Promise(() => undefined));
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    expect(await screen.findByText(DELETE_CONFIRMATION_LINE)).toBeInTheDocument();
    await screen.findByText("fresh notice");
    expect(lifecycle.confirmDelete).toHaveBeenCalledTimes(2);
    const confirm = screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!;
    await waitFor(() => expect(confirm).not.toBeDisabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(lifecycle.deleteEngine).toHaveBeenCalledTimes(2));
    expect(lifecycle.deleteEngine.mock.calls[0][0].deleteConfirmationId).toBe("66666666-6666-6666-6666-666666666666");
    expect(lifecycle.deleteEngine.mock.calls[1][0].deleteConfirmationId).toBe(FRESH_ID);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /delete this engine/i })).not.toBeInTheDocument()
    );
    expect(toastMessage).toHaveBeenCalledWith(cloudEngineDeletingToast("Production"));
  });

  it("shows the start error when fetching a fresh confirmation fails after an expired one", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockReset();
    viewState.refetch.mockResolvedValue({ ok: true, state: "ready", engine });
    lifecycle.confirmDelete
      .mockResolvedValueOnce({
        ok: true,
        confirmation: {
          id: "66666666-6666-6666-6666-666666666666",
          expiresAt: "2026-10-15T01:00:00Z",
          billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
        },
      })
      .mockResolvedValueOnce({ ok: false, code: "invalid_request", error: "nope" });
    lifecycle.deleteEngine.mockResolvedValueOnce(CONFIRMATION_INVALID);
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    expect(await screen.findByText(DELETE_START_ERROR_LINE)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)).toBeDisabled();
  });

  it("shows the start error when the fresh confirmation request rejects after an expired one", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockReset();
    viewState.refetch.mockResolvedValue({ ok: true, state: "ready", engine });
    lifecycle.confirmDelete
      .mockResolvedValueOnce({
        ok: true,
        confirmation: {
          id: "66666666-6666-6666-6666-666666666666",
          expiresAt: "2026-10-15T01:00:00Z",
          billingNotice: { code: "engine-deletion-leaves-subscription-active", message: "notice" },
        },
      })
      .mockRejectedValueOnce(new Error("network down"));
    lifecycle.deleteEngine.mockResolvedValueOnce(CONFIRMATION_INVALID);
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await screen.findByText("notice");
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    expect(await screen.findByText(DELETE_START_ERROR_LINE)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_CONFIRMATION_LINE)).not.toBeInTheDocument();
    expect(lifecycle.confirmDelete).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)).toBeDisabled();
    expect(screen.queryByText("network down")).not.toBeInTheDocument();
  });

  it("refetches once and says already being deleted when the refreshed engine shows a delete", async () => {
    viewState.current = { kind: "ready", engine };
    viewState.refetch.mockReset();
    viewState.refetch.mockResolvedValue({
      ok: true,
      state: "ready",
      engine: { ...engine, activeOperation: { id: "op", action: "Delete", state: "Running" } },
    });
    await submitDeleteWith(CONFIRMATION_INVALID);
    expect(await screen.findByText(DELETE_IN_PROGRESS_LINE)).toBeInTheDocument();
    expect(screen.queryByText(DELETE_CONFIRMATION_LINE)).not.toBeInTheDocument();
    expect(viewState.refetch).toHaveBeenCalledTimes(1);
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

  it("does not show the delete-start error when polling fails after Control accepts the delete", async () => {
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
      ok: false,
      code: "invalid_request",
      error: "Delete did not reach a terminal state.",
    });
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await waitFor(() => expect(lifecycle.confirmDelete).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => expect(lifecycle.pollDeleteOperation).toHaveBeenCalled());
    expect(screen.queryByText(DELETE_START_ERROR_LINE)).not.toBeInTheDocument();
    expect(screen.queryByText("Delete did not reach a terminal state.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /delete this engine/i })).not.toBeInTheDocument();
    const [row] = readDeletionHistory(viewState.workspaceId);
    expect(row?.state).toBeUndefined();
    expect(readPersistedDeletionHistory(viewState.workspaceId)[0]?.state).toBeUndefined();
    expect(unfinishedDeleteStateLabel(row?.state, row?.phase)).toBe(UNFINISHED_DELETE_STATE_UNAVAILABLE);
    expect(unfinishedDeleteStateLabel(row?.state, row?.phase)).not.toBe(UNFINISHED_DELETE_STATE_DELETING);
  });

  it("does not keep Deleting after a slow delete outlives the poll window", async () => {
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
      ok: false,
      code: "invalid_request",
      error: "Delete did not reach a terminal state.",
    });
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await waitFor(() => expect(lifecycle.confirmDelete).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => expect(lifecycle.pollDeleteOperation).toHaveBeenCalled());
    const stored = JSON.parse(
      localStorage.getItem(`elsa-hub.cloud.deletion-history.${viewState.workspaceId}`) ?? "[]",
    ) as Array<{ state?: string }>;
    expect(stored[0]?.state).toBeUndefined();
    expect(unfinishedDeleteStateLabel(
      readDeletionHistory(viewState.workspaceId)[0]?.state,
      readDeletionHistory(viewState.workspaceId)[0]?.phase,
    )).toBe(UNFINISHED_DELETE_STATE_UNAVAILABLE);
  });

  it("does not stamp a deletion row with a prior Create or Restart completedAt", async () => {
    viewState.current = {
      kind: "ready",
      engine: {
        ...engine,
        lastOperation: {
          action: "Create",
          state: "Succeeded",
          completedAt: "2026-09-01T00:00:00.000Z",
          failureCode: null,
        },
      },
    };
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
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => expect(lifecycle.pollDeleteOperation).toHaveBeenCalled());
    expect(readDeletionHistory(viewState.workspaceId)).toEqual([
      expect.objectContaining({
        instanceId: engine.id,
        completedAt: null,
        state: "Succeeded",
      }),
    ]);
  });

  it("stamps deleted-on from the Succeeded Delete completedAt, not a prior Create", async () => {
    const deleteCompleted = "2026-10-20T16:00:00.000Z";
    viewState.current = {
      kind: "ready",
      engine: {
        ...engine,
        lastOperation: {
          action: "Create",
          state: "Succeeded",
          completedAt: "2026-09-01T00:00:00.000Z",
          failureCode: null,
        },
      },
    };
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
      operation: {
        id: "55555555-5555-5555-5555-555555555555",
        action: "Delete",
        state: "Succeeded",
        completedAt: deleteCompleted,
      },
    });
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_DELETE_ENGINE }));
    await waitFor(() => expect(lifecycle.confirmDelete).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => expect(lifecycle.pollDeleteOperation).toHaveBeenCalled());
    expect(readDeletionHistory(viewState.workspaceId)).toEqual([
      expect.objectContaining({
        instanceId: engine.id,
        completedAt: deleteCompleted,
        state: "Succeeded",
      }),
    ]);
  });

  it("never renders Control unavailableReason; it maps the code instead", () => {
    viewState.current = {
      kind: "ready",
      engine: {
        ...engine,
        status: "Ready",
        health: "Degraded",
        unavailableReason: "This instance is not currently available.",
        unavailableReasonCode: "instance.unavailable",
      },
    };
    renderOverview();
    expect(screen.queryByText("This instance is not currently available.")).not.toBeInTheDocument();
    expect(screen.queryByText("instance.unavailable")).not.toBeInTheDocument();
    expect(screen.getByText("This engine isn't available, so Studio can't be opened.")).toBeInTheDocument();
  });

  it("shows the signed deleting body, not Control prose, for a Deleting engine", () => {
    viewState.current = {
      kind: "ready",
      engine: {
        ...engine,
        status: "Deleting",
        unavailableReason: "This instance is still being provisioned. Refresh to update its observed state.",
        unavailableReasonCode: "instance.provisioning",
        activeOperation: {
          id: "55555555-5555-5555-5555-555555555555",
          action: "Delete",
          state: "Accepted",
        },
      },
    };
    renderOverview();
    expect(screen.queryByText("This instance is still being provisioned. Refresh to update its observed state.")).not.toBeInTheDocument();
    expect(screen.getByText(CLOUD_REASON_DELETING_BODY)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deleting this engine" })).toBeInTheDocument();
    expect(screen.queryByText("Health")).not.toBeInTheDocument();
  });

  it("renders the deleted page in place when opening a Deleted engine URL, without redirecting", () => {
    viewState.current = { kind: "ready", engine: controlDeletedOverview({ name: "Test" }) };
    billingState.billingAccount = "linked";
    renderOverview();
    expect(screen.getByText(CLOUD_DELETED_BANNER_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_DELETED_BANNER_SECOND_LINE)).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_OPEN_STUDIO })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_DELETE_ENGINE })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_RESTART })).not.toBeInTheDocument();
    expect(screen.queryByText(CLOUD_STRUCTURED_LOGS)).not.toBeInTheDocument();
    expect(screen.queryByText("Health")).not.toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Release")).not.toBeInTheDocument();
    expect(screen.queryByText("instance.unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText("This instance is not currently available.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View invoices" })).toBeInTheDocument();
    expect(screen.queryByText("cloud home")).not.toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows Setup stopped and the #1011 line for a Failed Create, and hides Health", () => {
    viewState.current = { kind: "ready", engine: controlFailedSetupOverview() };
    renderOverview();
    expect(screen.getAllByText(CLOUD_STATUS_SETUP_STOPPED).length).toBeGreaterThan(0);
    expect(screen.getByText("Setup ran out of time while starting your engine.")).toBeInTheDocument();
    expect(screen.queryByText("Health")).not.toBeInTheDocument();
    expect(screen.queryByText("Unreachable")).not.toBeInTheDocument();
    expect(screen.queryByText("Not running")).not.toBeInTheDocument();
    expect(screen.queryByText(controlFailedSetupOverview().unavailableReason!)).not.toBeInTheDocument();
  });

  it("shows Needs attention and the generic fallback for a Failed Restart or a Failed engine with no lastOperation", () => {
    viewState.current = { kind: "ready", engine: controlFailedAfterReadyOverview() };
    const { unmount } = renderOverview();
    expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0);
    expect(screen.getByText(CLOUD_REASON_GENERIC_FALLBACK)).toBeInTheDocument();
    expect(screen.getByText("Restart this engine, or email hello@valence.works.")).toBeInTheDocument();
    expect(screen.queryByText("Not running")).not.toBeInTheDocument();
    expect(screen.queryByText("This engine isn't running.")).not.toBeInTheDocument();
    expect(screen.queryByText("Health")).not.toBeInTheDocument();
    unmount();
    viewState.current = { kind: "ready", engine: controlFailedWithoutOperationOverview() };
    renderOverview();
    expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0);
    expect(screen.getByText(CLOUD_REASON_GENERIC_FALLBACK)).toBeInTheDocument();
  });

  it("toasts Engine \"{name}\" deleted. only when Control reports Delete Succeeded", async () => {
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
    fireEvent.click(screen.getAllByRole("button", { name: CLOUD_DELETE_ENGINE }).at(-1)!);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(cloudEngineDeletedToast("Production")));
    expect(await screen.findByText("cloud home")).toBeInTheDocument();
  });
});
