import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CLOUD_UPDATING_HEADING } from "@/lib/cloudClient/copy";
import { CLOUD_UPDATING_MESSAGE } from "@/lib/cloudClient/contract";
import type { CloudEngineOverviewView } from "@/hooks/useCloudEngineOverview";

const viewState = vi.hoisted(() => ({
  current: { kind: "loading" } as CloudEngineOverviewView,
}));

vi.mock("@/hooks/useCloudEngineOverview", () => ({
  useCloudEngineOverview: () => ({ view: viewState.current }),
}));

import CloudEngineOverviewPage from "./CloudEngineOverview";

function renderOverview() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/cloud/engines/11111111-1111-4111-8111-111111111111"]}>
        <Routes>
          <Route path="/cloud/engines/:engineId" element={<CloudEngineOverviewPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("CloudEngineOverview", () => {
  afterEach(() => {
    document.querySelectorAll("meta[name='robots']").forEach((node) => node.remove());
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
});
