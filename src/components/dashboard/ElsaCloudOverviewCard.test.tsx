import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { CloudEngineListView } from "@/hooks/useCloudEngines";
import {
  CLOUD_EMPTY_MESSAGE,
  CLOUD_ERROR_HEADING,
  CLOUD_OPEN_LINK,
  CLOUD_PAGE_TITLE,
  CLOUD_SETUP_HEADING,
  CLOUD_SETUP_MESSAGE,
  CLOUD_UPDATING_HEADING,
  CLOUD_UPDATING_MESSAGE,
} from "@/lib/cloudClient";
import { ElsaCloudOverviewCard } from "./ElsaCloudOverviewCard";

const viewState = vi.hoisted(() => ({
  current: { kind: "empty" } as CloudEngineListView,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useCloudEngines", () => ({
  useCloudEngines: () => ({
    view: viewState.current,
    refetch: viewState.refetch,
  }),
}));

function renderCard() {
  return render(
    <MemoryRouter>
      <ElsaCloudOverviewCard orgSlug="acme" />
    </MemoryRouter>,
  );
}

describe("ElsaCloudOverviewCard", () => {
  it("shows no engines yet and links into the org Cloud page", () => {
    viewState.current = { kind: "empty" };
    renderCard();
    expect(screen.getByText(CLOUD_PAGE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: CLOUD_OPEN_LINK })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
  });

  it("renders needsSetup as its own state with an Open Elsa Cloud link", () => {
    viewState.current = { kind: "needsSetup" };
    renderCard();
    expect(screen.getByText(CLOUD_SETUP_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_SETUP_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_EMPTY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: CLOUD_OPEN_LINK })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
  });

  it("uses 1 engine / n engines and Control's status wording", () => {
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
    renderCard();
    expect(screen.getByText("1 engine")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("reuses the signed Control outage line when Control is down", () => {
    viewState.current = { kind: "updating", message: CLOUD_UPDATING_MESSAGE };
    renderCard();
    expect(screen.getByText(CLOUD_UPDATING_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_UPDATING_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/billing|cancel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(CLOUD_ERROR_HEADING)).not.toBeInTheDocument();
  });
});
