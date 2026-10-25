import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { ContextSwitcher } from "./ContextSwitcher";

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => ({
    organizations: [{ id: "org-1", name: "Acme", slug: "acme", role: "owner" }],
    createOrganization: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProviderMemberships", () => ({
  useProviderMemberships: () => ({
    providers: [{ id: "prov-1", name: "Valence", slug: "valence", role: "admin" }],
  }),
}));

vi.mock("@/components/account/CreateOrganizationDialog", () => ({
  CreateOrganizationDialog: () => null,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSwitcher(path = "/dashboard/org/acme") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route
          path="/dashboard/*"
          element={
            <DashboardProvider>
              <SidebarProvider>
                <ContextSwitcher />
                <div>dashboard</div>
              </SidebarProvider>
            </DashboardProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ContextSwitcher", () => {
  it("switches organizations through the router without a full reload", async () => {
    renderSwitcher();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/org/acme");

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByText("Valence"));

    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/provider/valence");
  });
});
