import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OTP_EXPIRED_AUTH_MESSAGE } from "@/lib/authErrors";
import { AUTH_REDIRECT_STORAGE_KEY } from "@/lib/authRedirect";

const navigate = vi.fn();
const verifyOtp = vi.fn();
const signOut = vi.fn(async () => ({ error: null }));

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
      signOut: () => signOut(),
    },
  },
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

describe("AuthConfirm", () => {
  beforeEach(() => {
    navigate.mockClear();
    verifyOtp.mockReset();
    signOut.mockClear();
    sessionStorage.clear();
    verifyOtp.mockResolvedValue({
      data: { user: sessionUser, session: { user: sessionUser } },
      error: null,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("keeps the stored redirect while verifyOtp is in flight and consumes it only on success", async () => {
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
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe("/dashboard/org/acme");
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
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBeNull();
    expect(AUTH_CONFIRM_SIGNED_IN_MS).toBe(3000);
    await act(async () => {
      vi.advanceTimersByTime(AUTH_CONFIRM_SIGNED_IN_MS);
    });
    expect(navigate).toHaveBeenCalledWith("/dashboard/org/acme");
  });

  it("does not consume the stored redirect when verifyOtp fails", async () => {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, "/dashboard/org/acme");
    verifyOtp.mockResolvedValueOnce({
      data: { session: null },
      error: { code: "otp_expired", message: "Email link is invalid or has expired" },
    });
    renderConfirm("?token_hash=abc&type=email");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(OTP_EXPIRED_AUTH_MESSAGE)).toBeInTheDocument();
    expect(sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)).toBe("/dashboard/org/acme");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("strips token_hash and type from the URL on mount", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...original,
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

    replaceState.mockRestore();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });
});
