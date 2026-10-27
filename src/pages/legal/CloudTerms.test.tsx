import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CloudTerms from "./CloudTerms";
import TermsIndex from "./TermsIndex";
import { CLOUD_TERMS_PATH, CLOUD_TERMS_SECTIONS } from "@/lib/cloudLegal";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

describe("CloudTerms page", () => {
  it("renders the Early Access Terms with every section", () => {
    render(
      <MemoryRouter>
        <CloudTerms />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Elsa Cloud Early Access Terms" })).toBeInTheDocument();
    expect(screen.getByText(/Effective 14 September 2026/)).toBeInTheDocument();
    for (const section of CLOUD_TERMS_SECTIONS) {
      expect(document.getElementById(section.id)).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: "hello@valence.works" })).toHaveAttribute("href", "mailto:hello@valence.works");
    expect(screen.queryByRole("link", { name: /DPA/ })).toBeNull();
  });
});

describe("TermsIndex", () => {
  it("links Elsa Cloud to the Cloud terms instead of showing Coming soon", () => {
    render(
      <MemoryRouter>
        <TermsIndex />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Elsa Cloud" })).toHaveAttribute("href", CLOUD_TERMS_PATH);
    expect(screen.queryByText("Coming soon.")).toBeNull();
  });
});
