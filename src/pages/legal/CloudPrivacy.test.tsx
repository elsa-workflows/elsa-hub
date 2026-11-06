import type { ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/App";
import { SITE_URL } from "@/lib/site";

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  OrganizationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/contexts/ThemePreferencesContext", () => ({
  ThemePreferencesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/weaver", () => ({
  WeaverProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  WeaverLauncher: () => null,
  WeaverHost: () => null,
}));

vi.mock("@/components/ScrollToTop", () => ({ ScrollToTop: () => null }));

vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderAppAt(path: string) {
  window.history.replaceState({}, "", path);
  return render(
    <HelmetProvider>
      <App />
    </HelmetProvider>,
  );
}

describe("Cloud privacy route", () => {
  it("serves the notice without a signed-in session and exposes all section anchors", async () => {
    renderAppAt("/legal/privacy");

    expect(await screen.findByRole("heading", { level: 1, name: "Privacy Notice" })).toBeInTheDocument();
    expect(screen.getByText(/Updated 30 October 2026\./)).toBeInTheDocument();
    expect(screen.getByText(/The controller for this notice is Skywalker Digital B\.V\./)).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Privacy navigation" });
    const anchors = within(navigation).getAllByRole("link");
    expect(anchors).toHaveLength(8);
    const targets = anchors.map((anchor) => anchor.getAttribute("href")?.slice(1));
    expect(new Set(targets).size).toBe(8);
    for (const target of targets) {
      expect(target).toBeTruthy();
      expect(document.getElementById(target!)).not.toBeNull();
    }

    expect(screen.getByRole("link", { name: "Subprocessors" })).toHaveAttribute("href", "/legal/subprocessors");
    expect(screen.getByRole("link", { name: "Data Processing Agreement" })).toHaveAttribute("href", "/legal/dpa");
    await waitFor(() => {
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `${SITE_URL}/legal/privacy`);
    });
  });

  it("links the Cloud Terms privacy notice to the Hub destination", async () => {
    renderAppAt("/legal/cloud-terms");

    expect(await screen.findByRole("heading", { level: 1, name: "Elsa Cloud Early Access Terms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read the privacy notice" })).toHaveAttribute("href", "/legal/privacy");
  });
});
