import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import Features from "./Features";
import GetStarted from "./GetStarted";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/analytics", () => ({
  track: () => undefined,
}));

vi.mock("@/components/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function renderPage(ui: ReactNode) {
  return render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

const FORBIDDEN = /production-tested|fully compliant|BPMN 2\.0 certified/i;

describe("BPMN positioning copy", () => {
  afterEach(() => {
    document
      .querySelectorAll(
        "link[rel='canonical'], meta[name='description'], meta[property^='og:'], meta[name^='twitter:'], script[type='application/ld+json']",
      )
      .forEach((node) => node.remove());
  });

  it("sets the home tagline and 3.9 BPMN SEO", async () => {
    renderPage(<Home />);

    await waitFor(() => {
      expect(document.title).toBe("The workflow and BPMN engine for .NET");
    });
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      "Build workflow-driven .NET apps with Elsa: C#, Elsa Studio, and BPMN 2.0 import, execution, and export in 3.9. Open source.",
    );
    expect(screen.getByText("THE WORKFLOW AND BPMN ENGINE FOR .NET")).toBeInTheDocument();
    expect(
      screen.getByAltText("The new React-based Elsa Studio designer (preview)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Preview, coming in Elsa 3.11")).toBeInTheDocument();
    expect(screen.getByText(/through the Elsa 3\.9 API/)).toBeInTheDocument();
    expect(screen.getByText(/Elsa 3\.9 exposes workflow instances and execution journals/)).toBeInTheDocument();
    expect(screen.getByText("Elsa.Bpmn", { selector: "code" })).toBeInTheDocument();
    expect(screen.getByText("Elsa.Bpmn.Interchange", { selector: "code" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it("documents verified 3.9 BPMN capabilities and labels preview work", async () => {
    renderPage(<Features />);

    await waitFor(() => {
      expect(document.title).toBe("Features — the workflow and BPMN engine for .NET");
    });
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toMatch(
      /Elsa\.Bpmn execution/,
    );
    expect(screen.getByRole("heading", { name: /workflow and BPMN automation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Elsa.Bpmn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Elsa.Bpmn.Interchange" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Studio 3.9" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "User Tasks in Core" })).toBeInTheDocument();
    expect(screen.getByText(/BPMN canvas is read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Preview \/ roadmap/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.11 React Studio preview/i)).toBeInTheDocument();
    expect(screen.getByText(/elsa-foundation/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Directory" })).toBeInTheDocument();
    expect(screen.getByText(/MQTT Sparkplug/i)).toBeInTheDocument();
    expect(screen.getByText("Elsa.Mqtt", { selector: "code" })).toBeInTheDocument();
    expect(screen.getByText("Elsa.Ldap", { selector: "code" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Extensions 3.9.0" }),
    ).toHaveAttribute("href", "https://github.com/elsa-workflows/elsa-extensions/releases/tag/3.9.0");
    expect(screen.getAllByRole("link", { name: "Core 3.9.0" }).length).toBeGreaterThan(0);
    expect(screen.getByText(/remain on the extensions roadmap/i)).toBeInTheDocument();
    expect(screen.queryByText(/BPMN 2\.0 certified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fully compliant/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it("mentions 3.9.0 BPMN packages on get-started without rewriting the release card", async () => {
    renderPage(<GetStarted />);

    await waitFor(() => {
      expect(document.title).toBe("Get started with the workflow and BPMN engine for .NET");
    });
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      "Setup guides for Elsa Server, Elsa Studio, a combined host, or Docker. Elsa 3.9.0 ships Elsa.Bpmn, Elsa.Bpmn.Interchange, and User Tasks.",
    );
    expect(screen.getAllByText(/Elsa 3\.9\.0 ships/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Elsa.Bpmn", { selector: "code" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/BPMN 2\.0 certified|fully compliant/i);
  });
});
