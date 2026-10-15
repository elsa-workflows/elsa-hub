import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EMAIL_SEND_RATE_LIMIT_MESSAGE } from "@/lib/authErrors";
import {
  MAGIC_LINK_RESEND_COOLDOWN_MS,
  MAGIC_LINK_STILL_SENDING_MS,
  PasswordlessAuth,
} from "./PasswordlessAuth";

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

  it("starts a 60s resend countdown when GoTrue rate-limits without a retry time", async () => {
    signInWithMagicLink.mockResolvedValueOnce({
      error: {
        name: "AuthApiError",
        status: 429,
        code: "over_email_send_rate_limit",
        message: "Email rate limit exceeded",
      } as Error,
    });
    render(<PasswordlessAuth />);
    fireEvent.change(screen.getByLabelText(/email for magic link/i), {
      target: { value: "qa@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));
    });

    expect(screen.getByText(EMAIL_SEND_RATE_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wait 60s to resend/i })).toBeDisabled();
  });

  it("uses the remaining seconds from the GoTrue message for the countdown", async () => {
    signInWithMagicLink.mockResolvedValueOnce({
      error: {
        name: "AuthApiError",
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 33 seconds.",
      } as Error,
    });
    render(<PasswordlessAuth />);
    fireEvent.change(screen.getByLabelText(/email for magic link/i), {
      target: { value: "qa@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));
    });

    expect(screen.getByText(EMAIL_SEND_RATE_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wait 33s to resend/i })).toBeDisabled();
  });

  it("shows Still sending after 8s while the OTP request is in flight", async () => {
    let release: (value: { error: null }) => void = () => {};
    signInWithMagicLink.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    render(<PasswordlessAuth />);
    fireEvent.change(screen.getByLabelText(/email for magic link/i), {
      target: { value: "qa@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));
    });
    expect(screen.queryByText(/still sending/i)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(MAGIC_LINK_STILL_SENDING_MS);
    });
    expect(screen.getByText(/still sending/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();

    await act(async () => {
      release({ error: null });
    });
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.queryByText(/still sending/i)).not.toBeInTheDocument();
  });
});
