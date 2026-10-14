import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const signIn = vi.fn(async () => ({ error: null }));
const signInWithGitHub = vi.fn(async () => ({ error: null }));
const signInWithGoogle = vi.fn(async () => ({ error: null }));
const signInWithMagicLink = vi.fn(async () => ({ error: null }));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn,
    signInWithGitHub,
    signInWithGoogle,
    signInWithMagicLink,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import Login from "./Login";

function renderLogin(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login", () => {
  beforeEach(() => {
    sessionStorage.clear();
    signIn.mockClear();
    signInWithGitHub.mockClear();
    signInWithGoogle.mockClear();
    signInWithMagicLink.mockClear();
    signInWithMagicLink.mockResolvedValue({ error: null });
  });

  it("offers GitHub, Google, a magic link, and password sign-in", () => {
    renderLogin();
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email me a sign-in link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with email/i })).toBeInTheDocument();
  });

  it("stores the intended page and starts GitHub OAuth", async () => {
    renderLogin("?redirect=/dashboard/settings");
    fireEvent.click(screen.getByRole("button", { name: /continue with github/i }));
    await waitFor(() => expect(signInWithGitHub).toHaveBeenCalled());
    expect(sessionStorage.getItem("authRedirect")).toBe("/dashboard/settings");
  });

  it("does not store an open-redirect payload from ?redirect=", async () => {
    renderLogin("?redirect=//evil.com");
    fireEvent.click(screen.getByRole("button", { name: /continue with github/i }));
    await waitFor(() => expect(signInWithGitHub).toHaveBeenCalled());
    expect(sessionStorage.getItem("authRedirect")).toBe("/dashboard");
  });

  it("shows a check-inbox state after a magic link is sent", async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email for magic link/i), {
      target: { value: "qa@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText("qa@example.com")).toBeInTheDocument();
    expect(signInWithMagicLink).toHaveBeenCalledWith("qa@example.com");
  });

  it("shows a rate-limit error instead of a silent failure", async () => {
    signInWithMagicLink.mockResolvedValueOnce({
      error: {
        name: "AuthApiError",
        message: "For security purposes, you can only request this after 60 seconds.",
      } as Error,
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/email for magic link/i), {
      target: { value: "qa@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

    expect(await screen.findByText(/could not send link/i)).toBeInTheDocument();
    expect(screen.getByText(/wait a minute/i)).toBeInTheDocument();
  });
});
