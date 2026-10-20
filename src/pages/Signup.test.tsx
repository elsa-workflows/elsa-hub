import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const signUp = vi.fn(async () => ({ error: null }));
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
    signUp,
    signInWithGitHub,
    signInWithGoogle,
    signInWithMagicLink,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import Signup from "./Signup";

describe("Signup", () => {
  beforeEach(() => {
    sessionStorage.clear();
    signUp.mockClear();
    signInWithGitHub.mockClear();
    signInWithGoogle.mockClear();
    signInWithMagicLink.mockClear();
  });

  it("offers GitHub, Google, a magic link, and password sign-up", () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email me a sign-in link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up with email/i })).toBeInTheDocument();
  });

  it("starts Google OAuth and remembers /dashboard", async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(sessionStorage.getItem("authRedirect")).toBe("/dashboard");
  });

  it("honors ?redirect= so Cloud waitlist signup can return to /dashboard/cloud", async () => {
    render(
      <MemoryRouter initialEntries={["/signup?redirect=/dashboard/cloud"]}>
        <Signup />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(sessionStorage.getItem("authRedirect")).toBe("/dashboard/cloud");
  });
});
