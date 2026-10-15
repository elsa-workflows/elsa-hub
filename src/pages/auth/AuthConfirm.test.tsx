import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OTP_EXPIRED_AUTH_MESSAGE } from "@/lib/authErrors";

const navigate = vi.fn();
const verifyOtp = vi.fn();

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

import AuthConfirm from "./AuthConfirm";

function renderConfirm(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/confirm${search}`]}>
      <AuthConfirm />
    </MemoryRouter>,
  );
}

describe("AuthConfirm", () => {
  beforeEach(() => {
    navigate.mockClear();
    verifyOtp.mockReset();
    verifyOtp.mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null });
  });

  it("does not call verifyOtp on render", () => {
    renderConfirm("?token_hash=abc&type=email");
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("calls verifyOtp with token_hash and type email on Sign in", async () => {
    renderConfirm("?token_hash=abc&type=email&redirect=/courses?x=1");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "email" }),
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/courses?x=1"));
  });

  it("shows Confirm for signup and verifies with type signup", async () => {
    renderConfirm("?token_hash=signup-hash&type=signup");
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "signup-hash", type: "signup" }),
    );
  });

  it("sanitizes a bad redirect to /dashboard", async () => {
    renderConfirm("?token_hash=abc&type=email&redirect=//evil.com");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
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
    renderConfirm("?token_hash=abc&type=magiclink");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(OTP_EXPIRED_AUTH_MESSAGE)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends recovery through verifyOtp then /reset-password", async () => {
    renderConfirm("?token_hash=rec&type=recovery");
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "rec", type: "recovery" }),
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/reset-password"));
  });
});
