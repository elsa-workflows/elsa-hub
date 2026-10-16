import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CloudBillingPanel } from "./CloudBillingPanel";

describe("CloudBillingPanel", () => {
  it("hides checkout and portal actions from non-admins", () => {
    render(
      <CloudBillingPanel
        isLoading={false}
        error={null}
        planName="Elsa Cloud Hosted"
        planStatus="active"
        subscription={{
          id: "sub_1",
          status: "active",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: "2026-11-15T00:00:00.000Z",
          planName: "Elsa Cloud Hosted",
        }}
        canManage={false}
        hasOrganization
        organizationLinked
        onSubscribe={vi.fn()}
        onManage={vi.fn()}
        checkoutPending={false}
        portalPending={false}
      />,
    );

    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage or cancel billing/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/only organization admins can start checkout or open the billing portal/i),
    ).toBeInTheDocument();
  });

  it("treats linked as the Control organization link, not admin status", () => {
    render(
      <CloudBillingPanel
        isLoading={false}
        error={null}
        planName={null}
        planStatus={null}
        subscription={null}
        canManage
        hasOrganization
        organizationLinked={false}
        onSubscribe={vi.fn()}
        onManage={vi.fn()}
        checkoutPending={false}
        portalPending={false}
      />,
    );

    expect(screen.getByText(/this organization is not linked to elsa cloud/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
  });

  it("does not treat a loading admin as linked", () => {
    render(
      <CloudBillingPanel
        isLoading
        error={null}
        planName={null}
        planStatus={null}
        subscription={null}
        canManage
        hasOrganization
        organizationLinked={false}
        onSubscribe={vi.fn()}
        onManage={vi.fn()}
        checkoutPending={false}
        portalPending={false}
      />,
    );

    expect(screen.getByText(/loading billing/i)).toBeInTheDocument();
    expect(screen.queryByText(/this organization is not linked to elsa cloud/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
  });

  it("lets an admin subscribe when there is no plan", () => {
    const onSubscribe = vi.fn();
    render(
      <CloudBillingPanel
        isLoading={false}
        error={null}
        planName={null}
        planStatus={null}
        subscription={null}
        canManage
        hasOrganization
        organizationLinked
        onSubscribe={onSubscribe}
        onManage={vi.fn()}
        checkoutPending={false}
        portalPending={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /subscribe to elsa cloud/i }));
    expect(onSubscribe).toHaveBeenCalled();
  });

  it("states that cancel keeps access until period end", () => {
    render(
      <CloudBillingPanel
        isLoading={false}
        error={null}
        planName="Elsa Cloud Hosted"
        planStatus="active"
        subscription={{
          id: "sub_1",
          status: "active",
          cancelAtPeriodEnd: true,
          currentPeriodEnd: "2026-11-15T00:00:00.000Z",
          planName: "Elsa Cloud Hosted",
        }}
        canManage
        hasOrganization
        organizationLinked
        onSubscribe={vi.fn()}
        onManage={vi.fn()}
        checkoutPending={false}
        portalPending={false}
      />,
    );

    expect(screen.getByText(/cancels at period end/i)).toBeInTheDocument();
    expect(screen.getByText(/access and billing continue until/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage or cancel billing/i })).toBeInTheDocument();
  });
});
