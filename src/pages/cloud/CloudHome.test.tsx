import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { CLOUD_EMPTY_MESSAGE, CLOUD_UPDATING_HEADING } from "@/lib/cloudClient/copy";
import { CLOUD_UPDATING_MESSAGE } from "@/lib/cloudClient/contract";
import type { CloudEngineListView } from "@/hooks/useCloudEngines";

const viewState = vi.hoisted(() => ({
  current: { kind: "loading" } as CloudEngineListView,
}));

vi.mock("@/hooks/useCloudEngines", () => ({
  useCloudEngines: () => ({ view: viewState.current }),
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
