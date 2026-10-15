import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ELSA_CLOUD_LEGAL_PAGES, elsaCloudLegalPath } from "@/lib/elsaCloud";
import CloudLegalTerms from "./CloudLegalTerms";
import CloudLegalPrivacy from "./CloudLegalPrivacy";
import CloudLegalDpa from "./CloudLegalDpa";
import CloudLegalSubprocessors from "./CloudLegalSubprocessors";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const pages = [
  {
    path: elsaCloudLegalPath("terms"),
    heading: "Early Access Terms",
    sample: "The service is provided by Skywalker Digital B.V.",
    element: <CloudLegalTerms />,
  },
  {
    path: elsaCloudLegalPath("privacy"),
    heading: "Privacy Notice",
    sample: "the Elsa Cloud pages on Elsa Hub",
    element: <CloudLegalPrivacy />,
  },
  {
    path: elsaCloudLegalPath("dpa"),
    heading: "Data Processing Addendum",
    sample: "The customer is the controller of Hosted customer content",
    element: <CloudLegalDpa />,
  },
  {
    path: elsaCloudLegalPath("subprocessors"),
    heading: "Service providers and subprocessors",
    sample: "Hosts Elsa Cloud Hosted environments in West Europe",
    element: <CloudLegalSubprocessors />,
  },
];

function renderLegal(initial: string, element: ReactNode) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path={initial} element={element} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Elsa Cloud legal pages", () => {
  afterEach(() => {
    document.querySelectorAll("meta[name='robots']").forEach((node) => node.remove());
  });

  it.each(pages)("renders $heading at $path", async ({ path: pagePath, heading, sample, element }) => {
    renderLegal(pagePath, element);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getAllByText(sample, { exact: false }).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(document.querySelector("meta[name='robots']")?.getAttribute("content")).toBe(
        "noindex,nofollow",
      );
    });
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      `https://www.elsaworkflows.io${pagePath}`,
    );
  });

  it("keeps legal cross-links on Hub paths", () => {
    renderLegal(elsaCloudLegalPath("terms"), <CloudLegalTerms />);
    expect(screen.getByRole("link", { name: "Privacy notice" })).toHaveAttribute(
      "href",
      ELSA_CLOUD_LEGAL_PAGES.privacy,
    );
    expect(screen.getByRole("link", { name: "Hosted DPA" })).toHaveAttribute(
      "href",
      ELSA_CLOUD_LEGAL_PAGES.dpa,
    );
  });

  it("does not add nav, footer, or sitemap links to the legal pages", () => {
    const repoRoot = process.cwd();
    const sources = [
      "src/components/layout/Navigation.tsx",
      "src/components/layout/Footer.tsx",
      "scripts/generate-sitemap.ts",
    ].map((file) => readFileSync(path.join(repoRoot, file), "utf8"));

    for (const source of sources) {
      expect(source).not.toMatch(/elsa-plus\/cloud\/legal/);
    }
  });
});
