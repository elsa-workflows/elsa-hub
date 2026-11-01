import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CloudDeletionHistory } from "@/components/cloud/CloudDeletionHistory";
import { CloudProvisioningTimeline } from "@/components/cloud/CloudProvisioningTimeline";
import { NEEDS_ATTENTION_LABEL } from "@/components/cloud/engineStatus";
import {
  PARKED_ENGINE_GUIDANCE_WITH_REFERENCE,
  formatParkedEngineGuidance,
} from "@/lib/cloud/parkedGuidance";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";
import type { DeletionHistoryRecord } from "@/lib/cloud/managedEngineDeletionHistory";

const OLD_ENGINE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NEW_ENGINE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OPERATION_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** Control #605 page: an old deleted engine and a new engine at FoundationReady/Workload, attempt 2. */
const deleted: DeletionHistoryRecord = {
  phase: "tracking",
  instanceId: OLD_ENGINE_ID,
  instanceName: "Old prod",
  completedAt: "2026-10-26T12:00:00.000Z",
  state: "Succeeded",
};

const liveEngine: CloudEngineOverview = {
  id: NEW_ENGINE_ID,
  name: "New prod",
  slug: "new-prod",
  status: "Provisioning",
  release: null,
  health: "Unknown",
  canOpen: false,
  version: 1,
  etag: '"1"',
  organizationId: null,
  audience: null,
  redirectUri: null,
  unavailableReason: null,
  unavailableReasonCode: null,
  activeOperation: {
    id: OPERATION_ID,
    action: "Create",
    state: "Accepted",
    acceptedAt: "2026-10-27T00:00:00.000Z",
    startedAt: "2026-10-27T00:00:00.000Z",
    progress: {
      phase: "FoundationReady",
      attemptedStep: "Workload",
      attemptNumber: 2,
      attemptStartedAt: "2026-10-31T00:00:00.000Z",
    },
  },
  lastOperation: null,
  allowedActions: {
    restart: { allowed: false, reasonCode: null },
    applyRelease: { allowed: false, reasonCode: null },
    open: { allowed: false, reasonCode: null },
    delete: { allowed: true, reasonCode: null },
  },
};

const progress: CloudProvisioningProgress = {
  state: "active",
  currentStage: "runtime-deployment",
  startedAt: "2026-10-27T00:00:00.000Z",
  lastUpdatedAt: "2026-10-31T00:00:00.000Z",
  completedAt: null,
  diagnosticCode: null,
  phase: "FoundationReady",
  attemptedStep: "Workload",
  attemptNumber: 2,
  attemptStartedAt: "2026-10-31T00:00:00.000Z",
  stages: [
    { code: "request-accepted", status: "completed", startedAt: null, completedAt: null },
    { code: "hosting-foundation", status: "completed", startedAt: null, completedAt: null },
    { code: "configuration", status: "completed", startedAt: null, completedAt: null },
    { code: "runtime-deployment", status: "current", startedAt: null, completedAt: null },
  ],
  activity: [{ sequence: 4, messageCode: "runtime.deploying" }],
};

describe("#605 console fixture", () => {
  it("shows the workload step, attempt 2 clock, and the prior deletion row", () => {
    render(
      <>
        <CloudDeletionHistory
          records={[deleted]}
          liveInstances={[{ id: NEW_ENGINE_ID, name: "New prod", createdAt: "2026-10-27T00:00:00.000Z" }]}
        />
        <CloudProvisioningTimeline progress={progress} engine={liveEngine} />
      </>,
    );

    expect(screen.getByText("Old prod deleted.")).toBeInTheDocument();
    expect(screen.getByText("Deploying Elsa runtime")).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 7")).toBeInTheDocument();
    expect(screen.getByText(/Attempt 2 · elapsed /)).toBeInTheDocument();
    expect(screen.getByText(/First started /)).toBeInTheDocument();
  });

  it("uses parked guidance for RecoveryRequired, not the old Setup didn't finish string", () => {
    const parked: CloudEngineOverview = {
      ...liveEngine,
      status: "RecoveryRequired",
      activeOperation: {
        id: OPERATION_ID,
        action: "Create",
        state: "RecoveryRequired",
      },
    };
    render(
      <CloudProvisioningTimeline
        engine={parked}
        progress={{
          ...progress,
          state: "stale",
          currentStage: null,
          stages: progress.stages.map((stage) => ({ ...stage, status: "unknown" })),
        }}
      />,
    );
    expect(screen.getByText(NEEDS_ATTENTION_LABEL)).toBeInTheDocument();
    expect(screen.getByText(formatParkedEngineGuidance(OPERATION_ID))).toBeInTheDocument();
    expect(screen.queryByText(/Setup didn't finish/)).not.toBeInTheDocument();
    expect(PARKED_ENGINE_GUIDANCE_WITH_REFERENCE).toContain("{operationId}");
  });
});
