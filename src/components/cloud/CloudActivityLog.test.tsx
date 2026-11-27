import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CloudActivityLog } from "./CloudActivityLog";
import { CLOUD_ACTIVITY_CHANGE_REQUESTED, CLOUD_ACTIVITY_FALLBACK } from "@/lib/cloudClient/signedCopy";
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
  it("on the signed path keeps a Control customer message and never falls back to eventType", () => {
    setCloudSignedCopyEnabledForTests(true);
    render(<CloudActivityLog items={[item({
      eventType: "lifecycle.failed",
      message: "Deployment status unclear. We're still confirming the result.",
    })]} />);
    expect(screen.getByText("Deployment status unclear. We're still confirming the result.")).toBeInTheDocument();
    expect(screen.queryByText("lifecycle.failed")).not.toBeInTheDocument();
    expect(screen.queryByText(CLOUD_ACTIVITY_FALLBACK)).not.toBeInTheDocument();
  });

  it("maps lifecycle.accepted to Change requested when there is no message, and other eventTypes to Engine activity", () => {
    setCloudSignedCopyEnabledForTests(true);
    const { unmount } = render(<CloudActivityLog items={[item({ message: null })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_CHANGE_REQUESTED)).toBeInTheDocument();
    expect(screen.queryByText("lifecycle.accepted")).not.toBeInTheDocument();
    unmount();
    render(<CloudActivityLog items={[item({ eventType: "lifecycle.failed", message: null, sequence: 2 })]} />);
    expect(screen.getByText(CLOUD_ACTIVITY_FALLBACK)).toBeInTheDocument();
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
