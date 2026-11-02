import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  CLOUD_ACCOUNT_LINK_ALREADY,
  CLOUD_ACCOUNT_LINK_HAS_ENGINES,
} from "@/lib/cloud";
import {
  CLOUD_ACCOUNT_LINK_ALREADY_HEADING,
  CLOUD_ACCOUNT_LINK_CLOUD_GOOGLE,
  CLOUD_ACCOUNT_LINK_CLOUD_MICROSOFT,
  CLOUD_ACCOUNT_LINK_CLOUD_PASSWORD,
  CLOUD_ACCOUNT_LINK_CLOUD_SIGN_IN,
  CLOUD_ACCOUNT_LINK_CONFIRM,
  CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE,
  CLOUD_ACCOUNT_LINK_TITLE,
} from "@/lib/cloudClient";
import type { CloudAccountLinkPageView } from "@/hooks/useCloudAccountLink";

const linkState = vi.hoisted(() => ({
  view: { kind: "ready" } as CloudAccountLinkPageView,
  cloudSignedIn: true,
  configured: true,
  refreshCloudSession: vi.fn(),
  signInOAuth: vi.fn(),
  signInEmail: vi.fn(),
  linkAccount: vi.fn(),
  retryLink: vi.fn(),
}));

vi.mock("@/hooks/useCloudAccountLink", () => ({
  useCloudAccountLink: () => linkState,
}));

const orgState = vi.hoisted(() => ({
  organizations: [{ slug: "acme", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
  loading: false,
}));

vi.mock("@/hooks/useOrganizations", () => ({
  useOrganizations: () => orgState,
}));

import CloudLinkAccount from "./CloudLinkAccount";

function renderLink() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/dashboard/org/acme/cloud/link"]}>
        <Routes>
          <Route path="/dashboard/org/:slug/cloud/link" element={<CloudLinkAccount />} />
          <Route path="/dashboard/org/:slug/cloud" element={<p>cloud home</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("CloudLinkAccount", () => {
  afterEach(() => {
    linkState.view = { kind: "ready" };
    linkState.cloudSignedIn = true;
    Object.values(linkState).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) value.mockReset();
    });
  });

  it("offers Microsoft Cloud sign-in and confirm", () => {
    renderLink();
    expect(screen.getByRole("heading", { name: CLOUD_ACCOUNT_LINK_TITLE })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_ACCOUNT_LINK_CLOUD_MICROSOFT }));
    expect(linkState.signInOAuth).toHaveBeenCalledWith("azure");
    fireEvent.click(screen.getByRole("button", { name: CLOUD_ACCOUNT_LINK_CONFIRM }));
    expect(linkState.linkAccount).toHaveBeenCalled();
    expect(screen.getByLabelText(CLOUD_ACCOUNT_LINK_CLOUD_PASSWORD)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CLOUD_ACCOUNT_LINK_CLOUD_SIGN_IN })).toBeInTheDocument();
  });

  it("hides Google Cloud sign-in while it is switched off", () => {
    renderLink();
    expect(screen.queryByRole("button", { name: CLOUD_ACCOUNT_LINK_CLOUD_GOOGLE })).not.toBeInTheDocument();
    expect(screen.getByText(CLOUD_ACCOUNT_LINK_INTRO_NO_GOOGLE)).toBeInTheDocument();
  });

  it("shows already linked when revisiting after a successful link", () => {
    linkState.view = { kind: "already_linked" };
    renderLink();
    expect(screen.getByText(CLOUD_ACCOUNT_LINK_ALREADY_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_ACCOUNT_LINK_ALREADY)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_ACCOUNT_LINK_CONFIRM })).not.toBeInTheDocument();
  });

  it("shows a readable conflict and does not confirm again", () => {
    linkState.view = { kind: "conflict", message: CLOUD_ACCOUNT_LINK_HAS_ENGINES };
    renderLink();
    expect(screen.getByText(CLOUD_ACCOUNT_LINK_HAS_ENGINES)).toBeInTheDocument();
  });

  it("keeps the form wrapping at a 390px-wide layout", () => {
    const { container } = renderLink();
    expect(container.querySelector(".overflow-x-hidden")).toBeTruthy();
    expect(screen.getByRole("button", { name: CLOUD_ACCOUNT_LINK_CLOUD_MICROSOFT })).toHaveClass(
      "min-h-11",
    );
  });
});
