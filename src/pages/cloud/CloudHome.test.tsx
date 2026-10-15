import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import {
  CLOUD_EMPTY_MESSAGE,
  CLOUD_ERROR_HEADING,
  CLOUD_SETUP_ACTION,
  CLOUD_UPDATING_HEADING,
  CLOUD_UPDATING_MESSAGE,
} from "@/lib/cloudClient";
import type { CloudEngineListView } from "@/hooks/useCloudEngines";

const viewState = vi.hoisted(() => ({
  current: { kind: "loading" } as CloudEngineListView,
  setupCloud: vi.fn(),
  setupPending: false,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useCloudEngines", () => ({
  useCloudEngines: () => ({
    view: viewState.current,
    setupCloud: viewState.setupCloud,
    setupPending: viewState.setupPending,
    refetch: viewState.refetch,
  }),
}));

import CloudHome from "./CloudHome";

function renderHome() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <CloudHome />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("CloudHome", () => {
  afterEach(() => {
    document.querySelectorAll("meta[name='robots']").forEach((node) => node.remove());
    viewState.setupCloud.mockReset();
    viewState.refetch.mockReset();
    viewState.setupPending = false;
  });

  it("shows a loading state", () => {
    viewState.current = { kind: "loading" };
    renderHome();
    expect(screen.getByRole("status")).toHaveTextContent(/loading engines/i);
  });

  it("shows the empty state", () => {
    viewState.current = { kind: "empty" };
    renderHome();
    expect(screen.getByText(CLOUD_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create|delete|billing/i })).not.toBeInTheDocument();
  });

  it("lists engines with name, status and release", () => {
    viewState.current = {
      kind: "list",
      engines: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Production",
          slug: "production",
          status: "Ready",
          release: "3.8.4",
        },
      ],
    };
    renderHome();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Release 3.8.4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /production/i })).toHaveAttribute(
      "href",
      "/cloud/engines/11111111-1111-4111-8111-111111111111",
    );
  });

  it("shows the Control updating state", () => {
    viewState.current = { kind: "updating", message: CLOUD_UPDATING_MESSAGE };
    renderHome();
    expect(screen.getByText(CLOUD_UPDATING_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_UPDATING_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_ERROR_HEADING)).not.toBeInTheDocument();
  });

  it("shows a separate error state with retry", () => {
    viewState.current = { kind: "error", message: "This workspace is not available." };
    renderHome();
    expect(screen.getByText(CLOUD_ERROR_HEADING)).toBeInTheDocument();
    expect(screen.getByText("This workspace is not available.")).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_UPDATING_HEADING)).not.toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(viewState.refetch).toHaveBeenCalled();
  });

  it("shows Set up Elsa Cloud when there is no org", () => {
    viewState.current = { kind: "needsSetup" };
    renderHome();
    expect(screen.getByRole("button", { name: CLOUD_SETUP_ACTION })).toBeInTheDocument();
    screen.getByRole("button", { name: CLOUD_SETUP_ACTION }).click();
    expect(viewState.setupCloud).toHaveBeenCalled();
  });

  it("marks the page noindex", async () => {
    viewState.current = { kind: "empty" };
    renderHome();
    await waitFor(() => {
      expect(document.querySelector("meta[name='robots']")?.getAttribute("content")).toBe(
        "noindex,nofollow",
      );
    });
  });
});
