import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MAGIC_LINK_RESEND_COOLDOWN_MS, PasswordlessAuth } from "./PasswordlessAuth";

const signInWithGitHub = vi.fn(async () => ({ error: null }));
const signInWithGoogle = vi.fn(async () => ({ error: null }));
const signInWithMagicLink = vi.fn(async () => ({ error: null }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signInWithGitHub,
    signInWithGoogle,
    signInWithMagicLink,
  }),
}));

describe("PasswordlessAuth magic-link cooldown", () => {
  beforeEach(() => {
    sessionStorage.clear();
    signInWithGitHub.mockClear();
    signInWithGoogle.mockClear();
    signInWithMagicLink.mockClear();
    signInWithMagicLink.mockResolvedValue({ error: null });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks another send for 60 seconds after a magic link is sent", async () => {
    render(<PasswordlessAuth redirectTo="/courses?x=1" />);

    fireEvent.change(screen.getByLabelText(/email for magic link/i), {
      target: { value: "qa@example.com" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));
    });

    expect(signInWithMagicLink).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.queryByText(/same browser/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem("authRedirect")).toBe("/courses?x=1");

    const waiting = screen.getByRole("button", { name: /wait 60s to resend/i });
    expect(waiting).toBeDisabled();

    await act(async () => {
      fireEvent.click(waiting);
    });
    expect(signInWithMagicLink).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(MAGIC_LINK_RESEND_COOLDOWN_MS - 1);
    });
    expect(screen.getByRole("button", { name: /wait .* to resend/i })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    const ready = screen.getByRole("button", { name: /resend link/i });
    expect(ready).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(ready);
    });
    expect(signInWithMagicLink).toHaveBeenCalledTimes(2);
  });
});
