import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CLOUD_PICK_ORG_HEADING } from "@/lib/cloudClient";
import { rememberSelectedOrganization } from "@/lib/selectedOrganization";
import { LegacyCloudRedirect, OrgCloudMembershipGate } from "./CloudRedirects";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
}));

const orgState = vi.hoisted(() => ({
  organizations: [] as { id: string; name: string; slug: string }[],
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => orgState,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

function renderLegacy(initial = "/cloud") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/cloud" element={<LegacyCloudRedirect />} />
        <Route path="/cloud/*" element={<LegacyCloudRedirect />} />
        <Route path="/elsa-plus/cloud" element={<LegacyCloudRedirect />} />
        <Route path="/elsa-plus/cloud/*" element={<LegacyCloudRedirect />} />
        <Route path="/elsa-plus/cloud-services" element={<LocationProbe />} />
        <Route path="/dashboard/cloud" element={<LocationProbe />} />
        <Route path="/dashboard/cloud/*" element={<LocationProbe />} />
        <Route path="/dashboard/org/:slug/cloud" element={<LocationProbe />} />
        <Route path="/dashboard/org/:slug/cloud/*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LegacyCloudRedirect", () => {
  afterEach(() => {
    localStorage.clear();
    orgState.organizations = [];
    orgState.loading = false;
    authState.user = null;
    authState.loading = false;
  });

  it("sends anonymous /cloud visitors to the dashboard Cloud route", () => {
    authState.user = null;
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderLegacy();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud");
  });

  it("keeps query and hash on anonymous /cloud", () => {
    authState.user = null;
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderLegacy("/cloud?payment=success#engines");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard/cloud?payment=success#engines",
    );
  });

  it("sends signed-in users with a Hub org to the org Cloud route", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [{ id: "org-1", name: "Acme", slug: "acme" }];
    orgState.loading = false;
    renderLegacy();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme/cloud");
  });

  it("preserves nested path, query, and hash for signed-in org visitors", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [{ id: "org-1", name: "Acme", slug: "acme" }];
    orgState.loading = false;
    renderLegacy("/cloud/engines/eng-1?session=checkout#status");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard/org/acme/cloud/engines/eng-1?session=checkout#status",
    );
  });

  it("keeps Cloud reachable for signed-in users with no Hub org", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderLegacy();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud");
  });

  it("sends anonymous engine visitors to the dashboard Cloud engine route", () => {
    authState.user = null;
    authState.loading = false;
    renderLegacy("/cloud/engines/eng-1?session=checkout#status");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard/cloud/engines/eng-1?session=checkout#status",
    );
  });

  it("sends signed-in engine visitors with no org to /dashboard/cloud/engines/:id", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderLegacy("/cloud/engines/eng-1");
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud/engines/eng-1");
  });

  it("redirects /elsa-plus/cloud to the dashboard Cloud route", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [{ id: "org-1", name: "Acme", slug: "acme" }];
    orgState.loading = false;
    renderLegacy("/elsa-plus/cloud");
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme/cloud");
  });

  it("sends signed-in users with several orgs to /dashboard/cloud so they can pick", () => {
    authState.user = { id: "user-1" };
    orgState.organizations = [
      { id: "org-1", name: "Acme", slug: "acme" },
      { id: "org-2", name: "Other Co", slug: "other-co" },
    ];
    renderLegacy();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud");
  });

  it("sends signed-in users with several orgs to the last-used org", () => {
    authState.user = { id: "user-1" };
    orgState.organizations = [
      { id: "org-1", name: "Acme", slug: "acme" },
      { id: "org-2", name: "Other Co", slug: "other-co" },
    ];
    rememberSelectedOrganization({ id: "org-2", name: "Other Co", slug: "other-co" });
    renderLegacy();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/other-co/cloud");
  });
});

function renderGate(path = "/dashboard/cloud") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard/cloud"
          element={(
            <OrgCloudMembershipGate>
              <p>no-org console</p>
            </OrgCloudMembershipGate>
          )}
        />
        <Route
          path="/dashboard/cloud/*"
          element={(
            <OrgCloudMembershipGate>
              <p>no-org console</p>
            </OrgCloudMembershipGate>
          )}
        />
        <Route path="/dashboard/org/:slug/cloud" element={<LocationProbe />} />
        <Route path="/dashboard/org/:slug/cloud/*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OrgCloudMembershipGate", () => {
  afterEach(() => {
    localStorage.clear();
    orgState.organizations = [];
    orgState.loading = false;
  });

  it("shows an org picker when the user has several orgs and none is last-used", () => {
    orgState.organizations = [
      { id: "org-1", name: "Acme", slug: "acme" },
      { id: "org-2", name: "Other Co", slug: "other-co" },
    ];
    renderGate();
    expect(screen.getByRole("heading", { name: CLOUD_PICK_ORG_HEADING })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
    expect(screen.getByRole("link", { name: "Other Co" })).toHaveAttribute(
      "href",
      "/dashboard/org/other-co/cloud",
    );
    expect(screen.queryByText("no-org console")).not.toBeInTheDocument();
  });

  it("remembers the chosen org and opens its Cloud route", () => {
    orgState.organizations = [
      { id: "org-1", name: "Acme", slug: "acme" },
      { id: "org-2", name: "Other Co", slug: "other-co" },
    ];
    renderGate();
    fireEvent.click(screen.getByRole("link", { name: "Other Co" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/other-co/cloud");
    expect(JSON.parse(localStorage.getItem("selected_organization") ?? "{}")).toEqual({
      id: "org-2",
      name: "Other Co",
      slug: "other-co",
    });
  });

  it("sends /dashboard/cloud to the last-used org", () => {
    orgState.organizations = [
      { id: "org-1", name: "Acme", slug: "acme" },
      { id: "org-2", name: "Other Co", slug: "other-co" },
    ];
    rememberSelectedOrganization({ id: "org-2", name: "Other Co", slug: "other-co" });
    renderGate();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/other-co/cloud");
    expect(screen.queryByRole("heading", { name: CLOUD_PICK_ORG_HEADING })).not.toBeInTheDocument();
  });
});
