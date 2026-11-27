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
  it("maps deployment.result-unconfirmed to Deployment result not confirmed.", () => {
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      diagnosticCode: "deployment.result-unconfirmed",
      severity: "Warning",
      message: "Deployment status unclear. We're still confirming the result.",
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED)).toBeInTheDocument();
    expect(screen.queryByText("Deployment status unclear. We're still confirming the result.")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
  });

  it("maps deployment.status-checking to Checking deployment status", () => {
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.reconciled",
      diagnosticCode: "deployment.status-checking",
      severity: "Informational",
      message: null,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHECKING_DEPLOYMENT)).toBeInTheDocument();
    expect(screen.queryByText("lifecycle.reconciled")).not.toBeInTheDocument();
  });

  it("falls back when there is no diagnosticCode: Change requested or Engine activity", () => {
    const { unmount } = render(<CloudActivityLog items={[item()]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHANGE_REQUESTED)).toBeInTheDocument();
    expect(screen.queryByText("lifecycle.accepted")).not.toBeInTheDocument();
    unmount();
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      diagnosticCode: null,
      sequence: 2,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
  });

  it("never selects a signed line from message or severity alone", () => {
    const { unmount } = render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      severity: "Warning",
      diagnosticCode: null,
      message: "Deployment status unclear. We're still confirming the result.",
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED)).not.toBeInTheDocument();
    expect(screen.queryByText("Deployment status unclear. We're still confirming the result.")).not.toBeInTheDocument();
    unmount();
    const second = render(<CloudActivityLog items={[item({
      eventType: "lifecycle.reconciled",
      severity: "Informational",
      diagnosticCode: null,
      message: "Checking deployment status",
      sequence: 2,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_ACTIVITY_CHECKING_DEPLOYMENT)).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.reconciled")).not.toBeInTheDocument();
    second.unmount();
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.accepted",
      diagnosticCode: null,
      message: CLOUD_ACTIVITY_CHECKING_DEPLOYMENT,
      sequence: 3,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHANGE_REQUESTED)).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_ACTIVITY_CHECKING_DEPLOYMENT)).not.toBeInTheDocument();
  });

  it("falls back for an unmapped diagnosticCode and does not render item.message", () => {
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      diagnosticCode: "health.failed",
      severity: "Failed",
      message: "raw classification prose",
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText("raw classification prose")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
  });

  it("never renders item.message or eventType when the signed-copy setting is off", () => {
    setCloudSignedCopyEnabledForTests(false);
    const { unmount } = render(<CloudActivityLog items={[item({
      eventType: "lifecycle.accepted",
      diagnosticCode: null,
      message: "Accepted the change.",
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHANGE_REQUESTED)).toBeInTheDocument();
    expect(screen.queryByText("Accepted the change.")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.accepted")).not.toBeInTheDocument();
    unmount();
    const second = render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      diagnosticCode: null,
      message: "Deployment status unclear. We're still confirming the result.",
      sequence: 2,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText("Deployment status unclear. We're still confirming the result.")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
    second.unmount();
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.reconciled",
      diagnosticCode: "deployment.status-checking",
      message: "Checking deployment status from Control",
      sequence: 3,
    })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHECKING_DEPLOYMENT)).toBeInTheDocument();
    expect(screen.queryByText("Checking deployment status from Control")).not.toBeInTheDocument();
    expect(screen.queryByText("lifecycle.reconciled")).not.toBeInTheDocument();
  });
});
