import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import ConfirmEmail from "./ConfirmEmail";

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("ConfirmEmail SEO", () => {
  afterEach(() => {
    document
      .querySelectorAll(
        "link[rel='canonical'], meta[name='description'], meta[property^='og:'], meta[name^='twitter:']",
      )
      .forEach((node) => node.remove());
  });

  it("sets its own title, description, and canonical", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/signup/confirm-email"]}>
          <ConfirmEmail />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.title).toBe("Confirm your email — Elsa+");
    });
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      "Check your inbox for a confirmation link to activate your Elsa+ account.",
    );
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://www.elsaworkflows.io/signup/confirm-email",
    );
  });
});
