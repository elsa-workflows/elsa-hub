import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CLOUD_UPDATING_RETRY } from "@/lib/cloudClient";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";
import { MANAGED_PROVISIONING_STAGE_CODES } from "@/lib/cloud/provisioningProgress";
import { provisioningStageLabels } from "@/lib/cloud/provisioningLabels";
import { CloudProvisioningTimeline, WAITING_FOR_PROGRESS_TITLE } from "./CloudProvisioningTimeline";
import { NEEDS_ATTENTION_LABEL } from "./engineStatus";

const unknownProgress: CloudProvisioningProgress = {
  state: "active",
  currentStage: null,
  startedAt: null,
  lastUpdatedAt: "2026-10-31T00:00:00.000Z",
  completedAt: null,
  diagnosticCode: null,
  stages: MANAGED_PROVISIONING_STAGE_CODES.map((code) => ({
    code,
    status: "unknown",
    startedAt: null,
    completedAt: null,
  })),
  activity: [],
};

const engine = (status: string, operationState?: string): CloudEngineOverview => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Prod",
  slug: "prod",
  status,
  release: null,
  health: "Unknown",
  canOpen: false,
  version: null,
  etag: null,
  organizationId: null,
  audience: null,
  redirectUri: null,
  activeOperation: operationState
    ? { id: "22222222-2222-4222-8222-222222222222", action: "Create", state: operationState }
    : null,
  allowedActions: {
    restart: { allowed: false, reasonCode: null },
    applyRelease: { allowed: false, reasonCode: null },
    open: { allowed: false, reasonCode: null },
    delete: { allowed: true, reasonCode: null },
  },
});

describe("CloudProvisioningTimeline", () => {
  it("hides the step count and pulse for an unmapped snapshot", () => {
    render(<CloudProvisioningTimeline progress={unknownProgress} engine={engine("Provisioning")} />);
    expect(screen.getByText(WAITING_FOR_PROGRESS_TITLE)).toBeInTheDocument();
    expect(screen.queryByText(/Step \d+ of 7/)).not.toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).toBeNull();
    expect(screen.getAllByText("status unavailable").length).toBe(7);
    expect(screen.getByText(provisioningStageLabels["request-accepted"])).toBeInTheDocument();
  });

  it("titles an unmapped RecoveryRequired snapshot Needs attention, never Failed", () => {
    render(
      <CloudProvisioningTimeline
        progress={unknownProgress}
        engine={engine("RecoveryRequired", "RecoveryRequired")}
      />,
    );
    expect(screen.getByText(NEEDS_ATTENTION_LABEL)).toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });

  it("keeps Check again as a secondary refresh", () => {
    const onRefresh = vi.fn();
    render(
      <CloudProvisioningTimeline
        progress={unknownProgress}
        engine={engine("RecoveryRequired")}
        onRefresh={onRefresh}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: CLOUD_UPDATING_RETRY }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
