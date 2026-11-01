import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  CLOUD_BILLING_NEEDS_LINK,
  CLOUD_BILLING_NO_CUSTOMER,
  CLOUD_BILLING_NOT_AVAILABLE_YET,
  CLOUD_BILLING_NOT_CONNECTED,
  CLOUD_BILLING_UNAVAILABLE,
  CLOUD_ERROR_RETRY,
  CLOUD_LINK_CHECK_ERROR,
} from "@/lib/cloudClient";
import { CloudBillingPanel } from "./CloudBillingPanel";

type PanelProps = ComponentProps<typeof CloudBillingPanel>;

function subscription(overrides: Partial<NonNullable<PanelProps["subscription"]>> = {}) {
  return {
    id: "sub_1",
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: "2026-11-15T00:00:00.000Z",
    planName: "Elsa Cloud Hosted",
    ...overrides,
  };
}

/** An admin of a linked org with an active plan, unless overridden. */
function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    isLoading: false,
    error: null,
    planName: "Elsa Cloud Hosted",
    planStatus: "active",
    subscription: subscription(),
    canManage: true,
    hasOrganization: true,
    billingAccount: "linked",
    cloudLink: "linked",
    onSubscribe: vi.fn(),
    onManage: vi.fn(),
    checkoutPending: false,
    portalPending: false,
    ...overrides,
  };
  render(
    <MemoryRouter>
      <CloudBillingPanel {...props} />
    </MemoryRouter>,
  );
  return props;
}

const noPlan = { planName: null, planStatus: null, subscription: null } as const;

describe("CloudBillingPanel", () => {
  it("hides checkout and portal actions from non-admins", () => {
    renderPanel({ canManage: false });

    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage or cancel billing/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/only organization admins can start checkout or open the billing portal/i),
    ).toBeInTheDocument();
  });

  it("lets an admin subscribe when there is no plan", () => {
    const { onSubscribe } = renderPanel(noPlan);

    fireEvent.click(screen.getByRole("button", { name: /subscribe to elsa cloud/i }));
    expect(onSubscribe).toHaveBeenCalled();
  });

  it.each(["canceled", "incomplete_expired"])(
    "lets an admin of a linked org subscribe again when its subscription is %s",
    (status) => {
      renderPanel({ planStatus: status, subscription: subscription({ status }) });

      expect(screen.getByRole("button", { name: /subscribe to elsa cloud/i })).toBeInTheDocument();
      expect(screen.getByText(/no elsa cloud plan yet/i)).toBeInTheDocument();
    },
  );

  it("states that cancel keeps access until period end", () => {
    renderPanel({ subscription: subscription({ cancelAtPeriodEnd: true }) });

    expect(screen.getByText(/cancels at period end/i)).toBeInTheDocument();
    expect(screen.getByText(/access and billing continue until/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage or cancel billing/i })).toBeInTheDocument();
  });

  it("does not treat org admin as linked when the Control organization link is missing", () => {
    renderPanel({
      ...noPlan,
      billingAccount: "missing",
      cloudLink: "missing",
      needsLink: true,
      cloudHomeHref: "/dashboard/org/acme/cloud",
    });

    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    const cta = screen.getByRole("link", { name: CLOUD_BILLING_NEEDS_LINK });
    expect(cta).toHaveAttribute("href", "/dashboard/org/acme/cloud");
  });

  it("shows a Retry control for a friendly billing outage", () => {
    const onRetry = vi.fn();
    renderPanel({
      ...noPlan,
      error: new Error(CLOUD_BILLING_UNAVAILABLE),
      onRetry,
    });

    expect(CLOUD_BILLING_UNAVAILABLE).toBe("We couldn't load billing. Please try again.");
    expect(screen.getByText(CLOUD_BILLING_UNAVAILABLE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CLOUD_ERROR_RETRY })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_ERROR_RETRY }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("tells an admin the org is not connected when checkout is unavailable", () => {
    renderPanel({
      ...noPlan,
      billingAccount: "missing",
      cloudLink: "missing",
      needsLink: false,
    });

    expect(CLOUD_BILLING_NOT_CONNECTED).toBe(
      "This organization isn't connected to Elsa Cloud, so checkout isn't available.",
    );
    expect(screen.getByText(CLOUD_BILLING_NOT_CONNECTED)).toBeInTheDocument();
    expect(screen.queryByText(/Hub-to-Control/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
  });

  it("shows Retry for a failed organization-link check, not the needs-link CTA", () => {
    const onRetry = vi.fn();
    renderPanel({
      ...noPlan,
      billingAccount: "missing",
      cloudLink: "missing",
      error: new Error(CLOUD_LINK_CHECK_ERROR),
      onRetry,
    });

    expect(screen.getByText(CLOUD_LINK_CHECK_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_ERROR_RETRY }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.queryByText(CLOUD_BILLING_NEEDS_LINK)).not.toBeInTheDocument();
  });

  it("shows a neutral unavailable notice and the link CTA when the org is unlinked", () => {
    renderPanel({
      ...noPlan,
      billingAccount: "missing",
      cloudLink: "missing",
      unavailable: true,
      needsLink: true,
      cloudHomeHref: "/dashboard/org/acme/cloud",
    });

    const notice = screen.getByText(CLOUD_BILLING_NOT_AVAILABLE_YET).closest("[role='alert']");
    expect(notice).toBeInTheDocument();
    expect(notice).not.toHaveClass("text-destructive");
    expect(screen.queryByText(/sandbox-only/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_ERROR_RETRY })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: CLOUD_BILLING_NEEDS_LINK })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud",
    );
  });

  it("shows only the neutral unavailable notice when the org is linked", () => {
    renderPanel({
      ...noPlan,
      billingAccount: "missing",
      cloudLink: "missing",
      unavailable: true,
      needsLink: false,
      cloudHomeHref: "/dashboard/org/acme/cloud",
    });

    expect(screen.getByText(CLOUD_BILLING_NOT_AVAILABLE_YET)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_BILLING_NEEDS_LINK)).not.toBeInTheDocument();
    expect(screen.queryByText(/not linked to elsa cloud/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CLOUD_ERROR_RETRY })).not.toBeInTheDocument();
  });

  it("lets an admin open the portal when a Cloud subscription exists without a Control link", () => {
    renderPanel({ cloudLink: "missing", needsLink: true });

    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    expect(screen.queryByText(CLOUD_BILLING_NEEDS_LINK)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage or cancel billing/i })).toBeInTheDocument();
  });

  it("hides the portal for a Control-sourced plan with no stored customer", () => {
    renderPanel({
      billingAccount: "missing",
      subscription: null,
    });

    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage or cancel billing/i })).not.toBeInTheDocument();
    expect(screen.getByText(CLOUD_BILLING_NO_CUSTOMER)).toBeInTheDocument();
  });

  it("still opens the portal when a Control-sourced plan has a stored customer", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: /manage or cancel billing/i })).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_BILLING_NO_CUSTOMER)).not.toBeInTheDocument();
  });

  it("explains that Cloud billing needs an organization instead of an admin-only notice", () => {
    renderPanel({
      ...noPlan,
      canManage: false,
      hasOrganization: false,
      billingAccount: "missing",
      cloudLink: "missing",
    });

    expect(screen.getByText(/cloud billing belongs to an organization/i)).toBeInTheDocument();
    expect(screen.queryByText(/only organization admins/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
