import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CloudPlanBanner } from "./CloudPlanBanner";

describe("CloudPlanBanner", () => {
  it("shows the plan and billing link once Control reports a live entitlement", () => {
    render(
      <MemoryRouter>
        <CloudPlanBanner
          planName="Elsa Cloud"
          planStatus="active"
          billingHref="/dashboard/org/acme/cloud/billing"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "Cloud plan" })).toHaveTextContent("Elsa Cloud");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /billing details/i })).toHaveAttribute(
      "href",
      "/dashboard/org/acme/cloud/billing",
    );
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
  });

  it("renders nothing without a live Control entitlement", () => {
    const { container } = render(
      <MemoryRouter>
        <CloudPlanBanner planName={null} planStatus={null} billingHref="/cloud/billing" />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each(["canceled", "incomplete_expired"])("hides an ended %s entitlement", (planStatus) => {
    const { container } = render(
      <MemoryRouter>
        <CloudPlanBanner planName="Elsa Cloud" planStatus={planStatus} billingHref="/cloud/billing" />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
