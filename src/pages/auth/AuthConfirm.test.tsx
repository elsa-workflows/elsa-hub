import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OTP_EXPIRED_AUTH_MESSAGE } from "@/lib/authErrors";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/lib/authRedirect";

const navigate = vi.fn();
const verifyOtp = vi.fn();
const signOut = vi.fn<(options?: { scope?: string }) => Promise<{ error: Error | null }>>();

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
      verifyOtp: (args: unknown) => verifyOtp(args),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signOut }),
}));

import AuthConfirm, { AUTH_CONFIRM_SIGNED_IN_MS } from "./AuthConfirm";

function renderConfirm(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/confirm${search}`]}>
      <AuthConfirm />
    </MemoryRouter>,
  );
}

const sessionUser = { id: "u1", email: "qa@example.com" };

const originalLocation = window.location;

describe("AuthConfirm", () => {
  beforeEach(() => {
    navigate.mockClear();
    verifyOtp.mockReset();
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
    sessionStorage.clear();
    verifyOtp.mockResolvedValue({
      data: { user: sessionUser, session: { user: sessionUser } },
      error: null,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  async function clickSignInAndAdvance(name: RegExp = /^sign in$/i) {
    fireEvent.click(screen.getByRole("button", { name }));
    await waitFor(() =>
      expect(
        screen.getByText(/signed in as qa@example.com\. not you\? sign out/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /^sign out$/i })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(AUTH_CONFIRM_SIGNED_IN_MS);
    });
  }

  async function signInAndWaitForPanel(email = "qa@example.com") {
    renderConfirm("?token_hash=abc&type=email&redirect=/courses");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() =>
      expect(screen.getByText(new RegExp(`signed in as ${email}`, "i"))).toBeInTheDocument(),
    );
  }

  it("Sign out ends only this session, cancels the pending navigation and goes to /login", async () => {
    await signInAndWaitForPanel();
    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    await act(async () => {
      vi.advanceTimersByTime(AUTH_CONFIRM_SIGNED_IN_MS * 2);
    });
    expect(navigate).not.toHaveBeenCalledWith("/courses");
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending navigation before sign-out resolves", async () => {
    let release: (value: { error: Error | null }) => void = () => {};
    signOut.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    await signInAndWaitForPanel();
    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));
    await act(async () => {
      vi.advanceTimersByTime(AUTH_CONFIRM_SIGNED_IN_MS * 2);
    });
    expect(navigate).not.toHaveBeenCalled();
    await act(async () => {
      release({ error: null });
    });
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("shows an error and stays on the page when sign-out fails", async () => {
    signOut.mockResolvedValueOnce({ error: new Error("network down") });
    await signInAndWaitForPanel();
    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));
    expect(await screen.findByText(/something went wrong while signing in/i)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(AUTH_CONFIRM_SIGNED_IN_MS * 2);
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^sign out$/i })).toBeInTheDocument();
  });

  it("ignores a second Sign out click while sign-out is in flight, and clears the error on retry", async () => {
    signOut.mockResolvedValueOnce({ error: new Error("network down") });
    await signInAndWaitForPanel();
    fireEvent.click(screen.getByRole("button", { name: /^sign out$/i }));
    expect(await screen.findByText(/something went wrong while signing in/i)).toBeInTheDocument();

    let release: (value: { error: Error | null }) => void = () => {};
    signOut.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const button = screen.getByRole("button", { name: /^sign out$/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(button).toBeDisabled();
    expect(screen.queryByText(/something went wrong while signing in/i)).not.toBeInTheDocument();

    await act(async () => {
      release({ error: null });
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("falls back to 'your account' when verifyOtp returns no email", async () => {
    verifyOtp.mockResolvedValueOnce({ data: { user: null, session: null }, error: null });
    await signInAndWaitForPanel("your account");
    expect(screen.getByText(/signed in as your account\. not you\? sign out/i)).toBeInTheDocument();
  });

  it("does not call verifyOtp on render", () => {
    renderConfirm("?token_hash=abc&type=email");
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("calls verifyOtp with token_hash and type email on Sign in", async () => {
    renderConfirm("?token_hash=abc&type=email&redirect=/courses?x=1");
    await clickSignInAndAdvance();
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" });
    expect(navigate).toHaveBeenCalledWith("/courses?x=1");
  });

  it("shows Confirm for signup and verifies with type signup", async () => {
    renderConfirm("?token_hash=signup-hash&type=signup");
    await clickSignInAndAdvance(/^confirm$/i);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "signup-hash", type: "signup" });
  });

  it("sanitizes a bad redirect to /dashboard", async () => {
    renderConfirm("?token_hash=abc&type=email&redirect=//evil.com");
    await clickSignInAndAdvance();
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });

  it("shows an error when token_hash is missing and does not verify", () => {
    renderConfirm("?type=email");
    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^sign in$/i })).not.toBeInTheDocument();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("maps otp_expired to the generic expired-link message", async () => {
    verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { code: "otp_expired", message: "Email link is invalid or has expired" },
    });
    renderConfirm("?token_hash=abc&type=email");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(OTP_EXPIRED_AUTH_MESSAGE)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("rejects type=recovery with the generic error and does not verify", () => {
    renderConfirm("?token_hash=rec&type=recovery");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByText(/something went wrong while signing in/i)).toBeInTheDocument();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("rejects type=magiclink with the generic error and does not verify", () => {
    renderConfirm("?token_hash=abc&type=magiclink");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(screen.getByText(/something went wrong while signing in/i)).toBeInTheDocument();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("consumes the stored redirect before verifyOtp so SIGNED_IN cannot race", async () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, "/dashboard/org/acme");
    let release: (value: unknown) => void = () => {};
    verifyOtp.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    renderConfirm("?token_hash=abc&type=email");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(verifyOtp).toHaveBeenCalled());
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
    await act(async () => {
      release({
        data: { user: sessionUser, session: { user: sessionUser } },
        error: null,
      });
    });
    await waitFor(() =>
      expect(
        screen.getByText(/signed in as qa@example.com\. not you\? sign out/i),
      ).toBeInTheDocument(),
    );
    await act(async () => {
      vi.advanceTimersByTime(AUTH_CONFIRM_SIGNED_IN_MS);
    });
    expect(navigate).toHaveBeenCalledWith("/dashboard/org/acme");
  });

  it("strips token_hash and type from the URL on mount", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        href: "http://localhost:3000/auth/confirm?token_hash=secret&type=email&redirect=/dashboard",
        pathname: "/auth/confirm",
        search: "?token_hash=secret&type=email&redirect=/dashboard",
        hash: "",
        origin: "http://localhost:3000",
      },
    });

    renderConfirm("?token_hash=secret&type=email&redirect=/dashboard");

    expect(replaceState).toHaveBeenCalled();
    const written = String(replaceState.mock.calls[0][2]);
    expect(written).not.toMatch(/token_hash/);
    expect(written).not.toMatch(/type=email/);
    const stripped = new URL(written, "http://localhost:3000");
    expect(stripped.searchParams.get("token_hash")).toBeNull();
    expect(stripped.searchParams.get("type")).toBeNull();
    expect(stripped.searchParams.get("redirect")).toBe("/dashboard");
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });
});
