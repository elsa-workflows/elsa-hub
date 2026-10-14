import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigate = vi.fn();
const getSession = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}));

import AuthCallback from "./AuthCallback";

function renderCallback() {
  return render(
    <MemoryRouter>
      <AuthCallback />
    </MemoryRouter>,
  );
}

describe("AuthCallback", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    navigate.mockClear();
    getSession.mockReset();
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        hash: "",
        search: "",
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("surfaces identity-linking failures from the query string", async () => {
    window.location.search =
      "?error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user";
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    renderCallback();

    expect(await screen.findByText(/verification failed/i)).toBeInTheDocument();
    expect(screen.getByText(/already linked to a different Elsa Hub user/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends a magic-link session on to the stored destination", async () => {
    sessionStorage.setItem("authRedirect", "/dashboard/org/acme");
    window.location.hash = "#type=magiclink";
    getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    renderCallback();

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard/org/acme"));
    expect(sessionStorage.getItem("authRedirect")).toBeNull();
  });
});
