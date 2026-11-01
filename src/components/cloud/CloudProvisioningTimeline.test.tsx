import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CLOUD_PROVISIONING_HEADING, CLOUD_UPDATING_RETRY } from "@/lib/cloudClient";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";
import { MANAGED_PROVISIONING_STAGE_CODES, UNKNOWN_ATTEMPT_CLOCK_LABEL } from "@/lib/cloud/provisioningProgress";
import { provisioningActivityLabels, provisioningStageLabels } from "@/lib/cloud/provisioningLabels";
import {
  EMPTY_OPERATION_ID,
  formatParkedDeleteGuidance,
  formatParkedEngineGuidance,
} from "@/lib/cloud/parkedGuidance";
import {
  STAGE_STATUS_COMPLETE,
  STAGE_STATUS_IN_PROGRESS,
  STAGE_STATUS_UP_NEXT,
} from "@/lib/cloud/provisioningPhases";
import { DELETING_THIS_ENGINE_HEADING } from "@/lib/cloud/managedEngineDeletionHistory";
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

  it("shows Control unavailableReason once under Deleting this engine", () => {
    const deleting = {
      ...engine("Deleting"),
      unavailableReason: "Deletion of this engine is in progress.",
      unavailableReasonCode: "delete-pending",
      activeOperation: {
        id: "22222222-2222-4222-8222-222222222222",
        action: "Delete",
        state: "Accepted",
      },
    };
    render(
      <CloudProvisioningTimeline
        progress={{ ...unknownProgress, currentStage: "runtime-deployment", stages: [] }}
        engine={deleting}
      />,
    );
    expect(screen.getByText("Deletion of this engine is in progress.")).toBeInTheDocument();
    expect(screen.getAllByText("Deletion of this engine is in progress.")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: DELETING_THIS_ENGINE_HEADING })).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_PROVISIONING_HEADING)).not.toBeInTheDocument();
    expect(screen.queryByText(WAITING_FOR_PROGRESS_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(provisioningStageLabels["runtime-deployment"])).not.toBeInTheDocument();
    expect(screen.queryByText(/Step \d+ of 7/)).not.toBeInTheDocument();
  });

  it("shows Deleting this engine without provisioning copy when a Delete has no progress", () => {
    const deleting = {
      ...engine("Deleting"),
      activeOperation: {
        id: "22222222-2222-4222-8222-222222222222",
        action: "Delete",
        state: "Accepted",
      },
    };
    render(<CloudProvisioningTimeline engine={deleting} />);
    expect(screen.getByRole("heading", { name: DELETING_THIS_ENGINE_HEADING })).toBeInTheDocument();
    expect(screen.queryByText(CLOUD_PROVISIONING_HEADING)).not.toBeInTheDocument();
    expect(screen.queryByText(WAITING_FOR_PROGRESS_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(provisioningStageLabels["request-accepted"])).not.toBeInTheDocument();
  });

  it("shows only the parked message for a parked Delete", () => {
    const parked = {
      ...engine("RecoveryRequired"),
      unavailableReason: "A human is finishing this deletion.",
      unavailableReasonCode: "delete-parked",
      activeOperation: {
        id: "22222222-2222-4222-8222-222222222222",
        action: "Delete",
        state: "RecoveryRequired",
        requiresHumanAt: "2026-10-31T00:00:00.000Z",
      },
    };
    render(
      <CloudProvisioningTimeline
        progress={{
          ...unknownProgress,
          state: "stale",
          diagnosticCode: "provisioning.requires-attention",
          attemptNumber: 2,
          attemptStartedAt: "2026-10-31T00:00:00.000Z",
          startedAt: "2026-10-27T00:00:00.000Z",
          activity: [{ sequence: 1, messageCode: "provisioning.requires-attention" }],
        }}
        engine={parked}
      />,
    );
    expect(screen.getByText("A human is finishing this deletion.")).toBeInTheDocument();
    expect(screen.getAllByText("A human is finishing this deletion.")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: DELETING_THIS_ENGINE_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: NEEDS_ATTENTION_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(CLOUD_PROVISIONING_HEADING)).not.toBeInTheDocument();
    expect(screen.queryByText(/Provisioning needs attention/)).not.toBeInTheDocument();
    expect(screen.queryByText(provisioningActivityLabels["provisioning.requires-attention"])).not.toBeInTheDocument();
    expect(screen.queryByText(UNKNOWN_ATTEMPT_CLOCK_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(/Attempt /)).not.toBeInTheDocument();
    expect(screen.queryByText(provisioningStageLabels["request-accepted"])).not.toBeInTheDocument();
    expect(screen.queryByText(/Step \d+ of 7/)).not.toBeInTheDocument();
  });

  it("shows parked engine and parked Delete copy when progress is missing", () => {
    const parkedEngine = engine("RecoveryRequired", "RecoveryRequired");
    const { unmount } = render(<CloudProvisioningTimeline engine={parkedEngine} />);
    expect(screen.getByText(formatParkedEngineGuidance(parkedEngine.activeOperation?.id))).toBeInTheDocument();
    expect(screen.queryByText(WAITING_FOR_PROGRESS_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(provisioningStageLabels["request-accepted"])).not.toBeInTheDocument();
    unmount();

    const parkedDelete = {
      ...engine("RecoveryRequired"),
      activeOperation: {
        id: "22222222-2222-4222-8222-222222222222",
        action: "Delete",
        state: "RecoveryRequired",
        requiresHumanAt: "2026-10-31T00:00:00.000Z",
      },
    };
    render(<CloudProvisioningTimeline engine={parkedDelete} />);
    expect(screen.getByText(formatParkedDeleteGuidance(parkedDelete.activeOperation.id))).toBeInTheDocument();
    expect(screen.getAllByText(formatParkedDeleteGuidance(parkedDelete.activeOperation.id))).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: DELETING_THIS_ENGINE_HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: NEEDS_ATTENTION_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByText(/Provisioning needs attention/)).not.toBeInTheDocument();
    expect(screen.queryByText(provisioningStageLabels["request-accepted"])).not.toBeInTheDocument();
  });

  it("maps stage statuses to signed labels and omits Technical details", () => {
    render(
      <CloudProvisioningTimeline
        progress={{
          ...unknownProgress,
          currentStage: "configuration",
          stages: [
            { code: "request-accepted", status: "completed", startedAt: null, completedAt: null },
            { code: "hosting-foundation", status: "Completed", startedAt: null, completedAt: null },
            { code: "configuration", status: "current", startedAt: null, completedAt: null },
            { code: "runtime-deployment", status: "pending", startedAt: null, completedAt: null },
          ],
        }}
        engine={engine("Provisioning")}
      />,
    );
    expect(screen.getAllByText(STAGE_STATUS_COMPLETE).length).toBeGreaterThan(0);
    expect(screen.getByText(STAGE_STATUS_IN_PROGRESS)).toBeInTheDocument();
    expect(screen.getAllByText(STAGE_STATUS_UP_NEXT).length).toBeGreaterThan(0);
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
    expect(screen.queryByText("current")).not.toBeInTheDocument();
    expect(screen.queryByText("pending")).not.toBeInTheDocument();
    expect(screen.queryByText("Technical details")).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_OPERATION_ID)).not.toBeInTheDocument();
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
