import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigate = vi.fn();
let authState: { user: { id: string } | null; loading: boolean } = {
  user: null,
  loading: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

import { CloudAuthGate } from "@/components/cloud/CloudAuthGate";

function renderGate(path = "/cloud") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CloudAuthGate>
        <div>cloud body</div>
      </CloudAuthGate>
    </MemoryRouter>,
  );
}

describe("CloudAuthGate", () => {
  it("sends anonymous visitors to login and back to /cloud", async () => {
    authState = { user: null, loading: false };
    navigate.mockReset();
    renderGate("/cloud");
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/login?redirect=%2Fcloud");
    });
  });

  it("renders children for a signed-in user", () => {
    authState = { user: { id: "user-1" }, loading: false };
    navigate.mockReset();
    const { getByText } = renderGate("/cloud/billing");
    expect(getByText("cloud body")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
