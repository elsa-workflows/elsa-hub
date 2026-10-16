import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  CLOUD_ERROR_HEADING,
  CLOUD_SETUP_ACTION,
  CLOUD_UPDATING_HEADING,
  CLOUD_UPDATING_MESSAGE,
} from "@/lib/cloudClient";
import type { CloudEngineOverviewView } from "@/hooks/useCloudEngineOverview";

const viewState = vi.hoisted(() => ({
  current: { kind: "loading" } as CloudEngineOverviewView,
  setupCloud: vi.fn(),
  setupPending: false,
  refetch: vi.fn(),
  workspaces: [] as { id: string; name: string }[],
  selectWorkspace: vi.fn(),
  selectedWorkspace: undefined as { id: string; name: string } | undefined,
}));

vi.mock("@/hooks/useCloudEngineOverview", () => ({
  useCloudEngineOverview: () => ({
    view: viewState.current,
    setupCloud: viewState.setupCloud,
    setupPending: viewState.setupPending,
    refetch: viewState.refetch,
    workspaces: viewState.workspaces,
    selectWorkspace: viewState.selectWorkspace,
    selectedWorkspace: viewState.selectedWorkspace,
  }),
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({ organizations: [{ slug: "acme" }], loading: false }),
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
  });

  it("shows a read-only overview with name, status and release", () => {
    viewState.current = {
      kind: "ready",
      engine: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Production",
        slug: "production",
        status: "Ready",
        release: "3.8.4",
        health: "Healthy",
        canOpen: true,
      },
    };
    renderOverview();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getByText("3.8.4")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|delete|billing/i })).not.toBeInTheDocument();
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

  it("can set up Elsa Cloud from a read-only overview without an org", () => {
    viewState.current = { kind: "needsSetup" };
    renderOverview();
    expect(screen.getByRole("button", { name: CLOUD_SETUP_ACTION })).toBeInTheDocument();
  });
});
