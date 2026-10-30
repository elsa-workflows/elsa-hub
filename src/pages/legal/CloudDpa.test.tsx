import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CloudDpa from "./CloudDpa";
import CloudSubprocessors from "./CloudSubprocessors";
import CloudTerms from "./CloudTerms";
import TermsIndex from "./TermsIndex";
import { CLOUD_DPA_ANNEXES, CLOUD_DPA_SECTIONS } from "@/lib/cloudDpa";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

describe("CloudDpa page", () => {
  it("renders every section and annex, with in-app links to the Hub legal pages", () => {
    render(
      <MemoryRouter>
        <CloudDpa />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Elsa Cloud Data Processing Agreement" })).toBeInTheDocument();
    for (const section of [...CLOUD_DPA_SECTIONS, ...CLOUD_DPA_ANNEXES]) {
      expect(document.getElementById(section.id)).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: "https://www.elsaworkflows.io/legal/subprocessors" })).toHaveAttribute(
      "href",
      "/legal/subprocessors",
    );
    expect(screen.getByRole("link", { name: "https://www.elsaworkflows.io/legal/cloud-terms" })).toHaveAttribute(
      "href",
      "/legal/cloud-terms",
    );
    expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(3);
  });
});

describe("CloudSubprocessors page", () => {
  it("renders Annex III Parts A and B and links back to the DPA", () => {
    render(
      <MemoryRouter>
        <CloudSubprocessors />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Elsa Cloud Sub-processors" })).toBeInTheDocument();
    expect(screen.getByText(/Part A: Sub-processors that process Customer Personal Data/)).toBeInTheDocument();
    expect(screen.getByText(/Part B: Service providers for accounts, sign-in and billing/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elsa Cloud Data Processing Agreement" })).toHaveAttribute("href", "/legal/dpa");
  });
});

describe("CloudTerms clause 04", () => {
  it("links the Subprocessors page on the Hub, not elsacloud.app", () => {
    render(
      <MemoryRouter>
        <CloudTerms />
      </MemoryRouter>,
    );
    const clause = document.getElementById("hosting-support");
    const link = clause?.querySelector('a[href="/legal/subprocessors"]');
    expect(link?.textContent).toBe("Subprocessors page");
    expect(clause?.querySelector('a[href*="elsacloud.app/subprocessors"]')).toBeNull();
  });
});

describe("TermsIndex", () => {
  it("lists the DPA and sub-processor pages under Elsa Cloud", () => {
    render(
      <MemoryRouter>
        <TermsIndex />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Elsa Cloud Data Processing Agreement" })).toHaveAttribute("href", "/legal/dpa");
    expect(screen.getByRole("link", { name: "Elsa Cloud Sub-processors" })).toHaveAttribute("href", "/legal/subprocessors");
  });
});
