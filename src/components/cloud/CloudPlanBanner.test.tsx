import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CLOUD_PREVIEW_LIMITS_HEADING, CLOUD_PREVIEW_ONE_USER } from "@/lib/cloudClient";
import { CloudPlanBanner } from "./CloudPlanBanner";

describe("CloudPlanBanner", () => {
  it("shows the plan once Control reports a live entitlement", () => {
    render(
      <MemoryRouter>
        <CloudPlanBanner planName="Elsa Cloud" planStatus="active" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "Cloud plan" })).toHaveTextContent("Elsa Cloud");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(CLOUD_PREVIEW_LIMITS_HEADING)).toBeInTheDocument();
    expect(screen.getByText(CLOUD_PREVIEW_ONE_USER)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /billing details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pricing/i })).not.toBeInTheDocument();
  });

  it("renders nothing without a live Control entitlement", () => {
    const { container } = render(
      <MemoryRouter>
        <CloudPlanBanner planName={null} planStatus={null} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each(["canceled", "incomplete_expired"])("hides an ended %s entitlement", (planStatus) => {
    const { container } = render(
      <MemoryRouter>
        <CloudPlanBanner planName="Elsa Cloud" planStatus={planStatus} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows No active plan for a Control Suspended (Hub ended) entitlement, not Paused", () => {
    render(
      <MemoryRouter>
        <CloudPlanBanner planName="Elsa Cloud" planStatus="ended" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "Cloud plan" })).toHaveTextContent("Elsa Cloud");
    expect(screen.getByText("No active plan")).toBeInTheDocument();
    expect(screen.queryByText("ended")).not.toBeInTheDocument();
    expect(screen.queryByText("Paused")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /subscribe/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Manage or cancel through the Hub billing portal/)).not.toBeInTheDocument();
  });

  it("still shows Paused when the Hub status is paused", () => {
    render(
      <MemoryRouter>
        <CloudPlanBanner planName="Elsa Cloud" planStatus="paused" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.queryByText("No active plan")).not.toBeInTheDocument();
  });
});
