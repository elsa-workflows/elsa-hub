import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CloudAuthGuard } from "./CloudAuthGuard";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderGuard(initial = "/elsa-plus/cloud") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/elsa-plus/cloud" element={<CloudAuthGuard />}>
          <Route index element={<div>signed-in cloud</div>} />
          <Route path="engines/:engineId" element={<div>signed-in overview</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("CloudAuthGuard", () => {
  it("redirects anonymous users to login and returns them to /elsa-plus/cloud", () => {
    authState.user = null;
    authState.loading = false;
    renderGuard("/elsa-plus/cloud/engines/11111111-1111-4111-8111-111111111111");
    expect(screen.getByTestId("location")).toHaveTextContent("/login?redirect=/elsa-plus/cloud");
    expect(screen.queryByText("signed-in overview")).not.toBeInTheDocument();
  });

  it("renders the cloud shell for a signed-in user", () => {
    authState.user = { id: "user-1" };
    authState.loading = false;
    renderGuard();
    expect(screen.getByText("signed-in cloud")).toBeInTheDocument();
  });
});
