import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import {
  CLOUD_CREATE_ENGINE,
  CLOUD_EMPTY_MESSAGE,
  CLOUD_ENGINES_INTRO,
  CLOUD_ERROR_HEADING,
  CLOUD_LIMIT_MESSAGE,
  CLOUD_LINK_CHECK_ERROR,
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ASK_ADMIN,
  CLOUD_MANAGE_LINK,
  CLOUD_ORG_LINK_CONFLICT,
  CLOUD_PAGE_TITLE,
  CLOUD_SETUP_ACTION,
  CLOUD_UPDATING_HEADING,
  CLOUD_UPDATING_MESSAGE,
  type CloudOnboardingOptions,
} from "@/lib/cloudClient";
import type { CloudOrganizationLinkView } from "@/lib/cloud";
import type { CloudEngineListView } from "@/hooks/useCloudEngines";

const options: CloudOnboardingOptions = {
  releases: [{
    distributionId: "valence-runtime",
    releaseLine: "3.8",
    version: "3.8.4",
    channel: "stable",
    topologyId: "combined",
  }],
  previewReleases: [],
  launchProfile: {
    name: "West Europe Dedicated",
    description: "Managed hosting in West Europe.",
    targetMode: "managed",
    regionCode: "westeurope",
    isolationProfile: "dedicated",
    capacityProfile: "standard-small",
    networkOutcome: "public",
    domainOutcome: "managed",
  },
};

const viewState = vi.hoisted(() => ({
  current: { kind: "loading" } as CloudEngineListView,
  setupCloud: vi.fn(),
  setupPending: false,
  refetch: vi.fn(),
  workspaces: [] as { id: string; name: string }[],
  selectWorkspace: vi.fn(),
  selectedWorkspace: undefined as { id: string; name: string } | undefined,
  options: undefined as CloudOnboardingOptions | undefined,
  atLimit: false,
  canCreate: false,
  createEngine: vi.fn(),
  creating: false,
}));

vi.mock("@/hooks/useCloudEngines", () => ({
  useCloudEngines: () => ({
    view: viewState.current,
    setupCloud: viewState.setupCloud,
    setupPending: viewState.setupPending,
    refetch: viewState.refetch,
    workspaces: viewState.workspaces,
    selectWorkspace: viewState.selectWorkspace,
    selectedWorkspace: viewState.selectedWorkspace,
    options: viewState.options,
    atLimit: viewState.atLimit,
    canCreate: viewState.canCreate,
    createEngine: viewState.createEngine,
    creating: viewState.creating,
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

import CloudHome from "./CloudHome";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderHome(path = "/dashboard/org/acme/cloud") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/org/:slug/cloud" element={<CloudHome />} />
          <Route path="/dashboard/cloud" element={<CloudHome />} />
          <Route path="/cloud" element={<CloudHome />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("CloudHome", () => {
  afterEach(() => {
    document.querySelectorAll("meta[name='robots']").forEach((node) => node.remove());
    viewState.setupCloud.mockReset();
    viewState.refetch.mockReset();
    viewState.createEngine.mockReset();
    viewState.setupPending = false;
    viewState.options = undefined;
    viewState.atLimit = false;
    viewState.canCreate = false;
    viewState.creating = false;
    orgState.organizations = [{ slug: "acme", id: HUB_ORG_ID }];
    orgState.loading = false;
    orgLinkState.current = { kind: "idle" };
    orgLinkState.refetch.mockReset();
    localStorage.clear();
  });

  it("shows a loading state", () => {
    viewState.current = { kind: "loading" };
    renderHome();
    expect(screen.getByRole("status")).toHaveTextContent(/loading engines/i);
  });

  it("shows the empty state with Create engine when under the limit", () => {
    viewState.current = { kind: "empty" };
    viewState.options = options;
    viewState.canCreate = true;
    renderHome();
    expect(screen.getByRole("heading", { name: CLOUD_PAGE_TITLE })).toBeInTheDocument();
    expect(screen.getByText(CLOUD_ENGINES_INTRO)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: CLOUD_MANAGE_LINK })).toHaveAttribute(
      "href",
      "https://elsacloud.app",
    );
    expect(screen.getByRole("button", { name: CLOUD_CREATE_ENGINE })).toBeInTheDocument();
  });

  it("hides Create engine at the plan limit and does not start create", async () => {
    viewState.current = {
      kind: "list",
      engines: [{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Production",
        slug: "production",
        status: "Ready",
        release: "3.8.4",
      }],
    };
    viewState.atLimit = true;
    viewState.canCreate = false;
    renderHome();
    expect(screen.getByText(CLOUD_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_CREATE_ENGINE })).not.toBeInTheDocument();
    expect(viewState.createEngine).not.toHaveBeenCalled();
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
      "/dashboard/org/acme/cloud/engines/11111111-1111-4111-8111-111111111111",
    );
  });

  it("shows the Control updating state and hides create", () => {
    viewState.current = { kind: "updating", message: CLOUD_UPDATING_MESSAGE };
    viewState.options = options;
    viewState.canCreate = false;
    renderHome();
    expect(screen.getByText(CLOUD_UPDATING_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_UPDATING_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_CREATE_ENGINE })).not.toBeInTheDocument();
    expect(viewState.createEngine).not.toHaveBeenCalled();
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

  it("redirects org Cloud routes whose slug is not a membership", () => {
    viewState.current = { kind: "empty" };
    orgState.organizations = [{ slug: "acme", id: HUB_ORG_ID }];
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/dashboard/org/other-co/cloud"]}>
          <Routes>
            <Route path="/dashboard/org/:slug/cloud" element={<CloudHome />} />
            <Route path="/dashboard/cloud" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud");
    expect(screen.queryByText(CLOUD_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  it("sends /dashboard/cloud to the org Cloud route when the user has a Hub org", () => {
    viewState.current = { kind: "empty" };
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/dashboard/cloud"]}>
          <Routes>
            <Route path="/dashboard/cloud" element={<CloudHome />} />
            <Route path="/dashboard/org/:slug/cloud" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme/cloud");
    expect(screen.queryByText(CLOUD_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  it("shows Set up Elsa Cloud when there is no org", () => {
    viewState.current = { kind: "needsSetup" };
    renderHome();
    expect(screen.getByRole("button", { name: CLOUD_SETUP_ACTION })).toBeInTheDocument();
    screen.getByRole("button", { name: CLOUD_SETUP_ACTION }).click();
    expect(viewState.setupCloud).toHaveBeenCalledWith(HUB_ORG_ID);
  });

  it("shows a link conflict as a clear error", () => {
    viewState.current = { kind: "error", message: CLOUD_ORG_LINK_CONFLICT };
    renderHome();
    expect(screen.getByText(CLOUD_ERROR_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_ORG_LINK_CONFLICT)).toBeInTheDocument();
  });

  it("shows Link this organization after /dashboard/cloud redirects to an unlinked org", () => {
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = { kind: "needsSetup" };
    renderHome("/dashboard/cloud");
    expect(screen.getByRole("button", { name: CLOUD_LINK_ORG_ACTION })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_SETUP_ACTION })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_LINK_ORG_ACTION }));
    expect(viewState.setupCloud).toHaveBeenCalledWith(HUB_ORG_ID);
  });

  it("shows Link this organization when engines already exist but the org has no validated link", () => {
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = {
      kind: "list",
      engines: [{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Production",
        slug: "production",
        status: "Ready",
        release: "3.8.4",
      }],
    };
    renderHome();
    expect(screen.queryByText("Production")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_LINK_ORG_ACTION }));
    expect(viewState.setupCloud).toHaveBeenCalledWith(HUB_ORG_ID);
  });

  it("links a second unlinked org with that org's Hub id", () => {
    const secondOrgId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    orgState.organizations = [
      { slug: "acme", id: HUB_ORG_ID },
      { slug: "other-co", id: secondOrgId },
    ];
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = { kind: "needsSetup" };
    renderHome("/dashboard/org/other-co/cloud");
    fireEvent.click(screen.getByRole("button", { name: CLOUD_LINK_ORG_ACTION }));
    expect(viewState.setupCloud).toHaveBeenCalledWith(secondOrgId);
  });

  it("asks a member to wait for an admin when the org is unlinked", () => {
    orgLinkState.current = { kind: "needsLink", canLink: false };
    viewState.current = {
      kind: "list",
      engines: [{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Production",
        slug: "production",
        status: "Ready",
        release: "3.8.4",
      }],
    };
    renderHome();
    expect(screen.getByText(CLOUD_LINK_ORG_ASK_ADMIN)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_LINK_ORG_ACTION })).not.toBeInTheDocument();
    expect(viewState.setupCloud).not.toHaveBeenCalled();
  });

  it("still shows a link conflict when the org needs a link", () => {
    orgLinkState.current = { kind: "needsLink", canLink: true };
    viewState.current = { kind: "error", message: CLOUD_ORG_LINK_CONFLICT };
    renderHome();
    expect(screen.getByText(CLOUD_ORG_LINK_CONFLICT)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_LINK_ORG_ACTION })).not.toBeInTheDocument();
  });

  it("shows a retryable error when the link check fails", () => {
    orgLinkState.current = { kind: "error" };
    viewState.current = {
      kind: "list",
      engines: [{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Production",
        slug: "production",
        status: "Ready",
        release: "3.8.4",
      }],
    };
    renderHome();
    expect(screen.getByText(CLOUD_ERROR_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_LINK_CHECK_ERROR)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_LINK_ORG_ACTION })).not.toBeInTheDocument();
    expect(screen.queryByText("Production")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(orgLinkState.refetch).toHaveBeenCalled();
  });

  it("creates an engine from the empty state", async () => {
    viewState.current = { kind: "empty" };
    viewState.options = options;
    viewState.canCreate = true;
    viewState.createEngine.mockResolvedValue({
      ok: true,
      engine: { id: "11111111-1111-4111-8111-111111111111" },
    });
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_CREATE_ENGINE }));
    await screen.findByRole("heading", { name: CLOUD_CREATE_ENGINE });
    const nameInput = await screen.findByLabelText(/engine name/i);
    fireEvent.change(nameInput, { target: { value: "Production" } });
    const submit = screen.getAllByRole("button", { name: CLOUD_CREATE_ENGINE }).at(-1);
    expect(submit).toBeTruthy();
    fireEvent.click(submit!);
    await waitFor(() => {
      expect(viewState.createEngine).toHaveBeenCalledWith(expect.objectContaining({
        name: "Production",
        slug: "production",
      }));
    });
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
