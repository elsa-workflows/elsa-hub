import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CloudActivityLog } from "./CloudActivityLog";
import {
  CLOUD_ACTIVITY_CHANGE_REQUESTED,
  CLOUD_ACTIVITY_CHECKING_DEPLOYMENT,
  CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED,
  CLOUD_ACTIVITY_FALLBACK,
} from "@/lib/cloudClient/signedCopy";
import { setCloudSignedCopyEnabledForTests } from "@/lib/cloudClient/signedCopyFlag";
import type { CloudActivityItem } from "@/lib/cloudClient";

afterEach(() => setCloudSignedCopyEnabledForTests(undefined));

function item(overrides: Partial<CloudActivityItem> = {}): CloudActivityItem {
  return {
    sequence: 1,
    eventType: "lifecycle.accepted",
    occurredAt: "2026-11-27T15:00:00.000Z",
    action: null,
    diagnosticCode: null,
    severity: "Informational",
    message: null,
    ...overrides,
  };
}

describe("CloudActivityLog", () => {
  it("maps Control's warning classification to Deployment result not confirmed. and never shows the Control prose", () => {
    setCloudSignedCopyEnabledForTests(true);
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      severity: "Warning",
      diagnosticCode: null,
      message: "Deployment status unclear. We're still confirming the result.",
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED)).toBeInTheDocument();
    expect(screen.queryByText("Deployment status unclear. We're still confirming the result.")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
  });

  it("maps Control's checking classification to the signed Checking deployment status line", () => {
    setCloudSignedCopyEnabledForTests(true);
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.reconciled",
      severity: "Informational",
      diagnosticCode: null,
      message: "Checking deployment status",
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHECKING_DEPLOYMENT)).toBeInTheDocument();
    expect(screen.queryByText("lifecycle.reconciled")).not.toBeInTheDocument();
  });

  it("does not render an unmapped item.message, and uses Change requested or Engine activity", () => {
    setCloudSignedCopyEnabledForTests(true);
    const { unmount } = render(<CloudActivityLog items={[item({ message: "Accepted the change." })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHANGE_REQUESTED)).toBeInTheDocument();
    expect(screen.queryByText("Accepted the change.")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.accepted")).not.toBeInTheDocument();
    unmount();
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      diagnosticCode: "health.failed",
      severity: "Failed",
      message: "raw classification prose",
      sequence: 2,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText("raw classification prose")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
  });

  it("on the flag-off path still uses message ?? eventType", () => {
    setCloudSignedCopyEnabledForTests(false);
    const { unmount } = render(<CloudActivityLog items={[item({ message: "Accepted the change." })]} />);
    expect(screen.getByText("Accepted the change.")).toBeInTheDocument();
    unmount();
    render(<CloudActivityLog items={[item({ message: null })]} />);
    expect(screen.getByText("lifecycle.accepted")).toBeInTheDocument();
  });
});
