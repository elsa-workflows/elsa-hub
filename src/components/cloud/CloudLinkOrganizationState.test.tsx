import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  CLOUD_ERROR_RETRY,
  CLOUD_LINK_ORG_ACTION,
  CLOUD_LINK_ORG_ERROR,
  CLOUD_LINK_ORG_UPDATING,
} from "@/lib/cloudClient";
import { CloudLinkOrganizationState } from "./CloudLinkOrganizationState";

describe("CloudLinkOrganizationState", () => {
  it("shows a spinner and disables the link button while pending", () => {
    render(
      <CloudLinkOrganizationState
        canLink
        onLink={vi.fn()}
        pending
        status="pending"
      />,
    );
    const button = screen.getByRole("button", { name: CLOUD_LINK_ORG_ACTION });
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("shows the updating copy for a 503 bootstrap and keeps the console hidden", () => {
    render(
      <CloudLinkOrganizationState
        canLink
        onLink={vi.fn()}
        status="updating"
        message={CLOUD_LINK_ORG_UPDATING}
      />,
    );
    expect(screen.getByText(CLOUD_LINK_ORG_UPDATING)).toBeInTheDocument();
    expect(screen.queryByText(/your elsa cloud engines/i)).not.toBeInTheDocument();
  });

  it("shows an error and Retry for 401 or 403", () => {
    const onRetry = vi.fn();
    render(
      <CloudLinkOrganizationState
        canLink
        onLink={vi.fn()}
        onRetry={onRetry}
        status="error"
        message={CLOUD_LINK_ORG_ERROR}
      />,
    );
    expect(screen.getByText(CLOUD_LINK_ORG_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CLOUD_ERROR_RETRY }));
    expect(onRetry).toHaveBeenCalled();
  });
});
