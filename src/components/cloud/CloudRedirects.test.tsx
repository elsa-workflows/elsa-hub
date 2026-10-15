import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CloudEngineRedirect, CloudIndexRedirect } from "./CloudRedirects";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
}));

const orgState = vi.hoisted(() => ({
  organizations: [] as { slug: string }[],
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
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderIndex(initial = "/cloud") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/cloud" element={<CloudIndexRedirect />} />
        <Route path="/elsa-plus/cloud-services" element={<LocationProbe />} />
        <Route path="/dashboard/cloud" element={<LocationProbe />} />
        <Route path="/dashboard/org/:slug/cloud" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderEngine(initial = "/cloud/engines/eng-1") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/cloud/engines/:engineId" element={<CloudEngineRedirect />} />
        <Route path="/dashboard/cloud/engines/:engineId" element={<LocationProbe />} />
        <Route path="/dashboard/org/:slug/cloud/engines/:engineId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CloudRedirects", () => {
  it("sends anonymous /cloud visitors to the public Elsa Cloud page", () => {
    authState.user = null;
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderIndex();
    expect(screen.getByTestId("location")).toHaveTextContent("/elsa-plus/cloud-services");
  });

  it("sends signed-in users with a Hub org to the org Cloud route", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [{ slug: "acme" }];
    orgState.loading = false;
    renderIndex();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme/cloud");
  });

  it("keeps Cloud reachable for signed-in users with no Hub org", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderIndex();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud");
  });

  it("sends anonymous engine visitors to login and then back to the engine URL", () => {
    authState.user = null;
    authState.loading = false;
    renderEngine();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/login?redirect=%2Fcloud%2Fengines%2Feng-1",
    );
  });

  it("sends signed-in engine visitors with no org to /dashboard/cloud/engines/:id", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    orgState.organizations = [];
    orgState.loading = false;
    renderEngine();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/cloud/engines/eng-1");
  });
});
