import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CLOUD_PROVISIONING_HEADING } from "@/lib/cloudClient";
import type { CloudEngineOverview, CloudProvisioningProgress } from "@/lib/cloud/actions";
import { MANAGED_PROVISIONING_STAGE_CODES } from "@/lib/cloud/provisioningProgress";
import { provisioningStageLabels } from "@/lib/cloud/provisioningLabels";
import { STAGE_STATUS_IN_PROGRESS, STAGE_STATUS_NEEDS_ATTENTION } from "@/lib/cloud/provisioningPhases";
import { CloudProvisioningTimeline } from "./CloudProvisioningTimeline";

const TITLE = "Engine setup stopped";
const SIGNED: Record<string, string> = {
  "provisioning.timeout.foundation": "Setup ran out of time while preparing your engine's infrastructure.",
  "provisioning.timeout.workload": "Setup ran out of time while starting your engine.",
  "provisioning.timeout.health": "Setup ran out of time while checking that your engine is healthy.",
  "provisioning.health.crash-loop": "Your engine kept stopping during startup, so it never became healthy.",
};
const FALLBACK = "Setup stopped before your engine was ready.";
const NEITHER = "For help, email hello@valence.works.";
const RETRY_ONLY = "Retry setup, or email hello@valence.works.";
const TODAY_FAILED_AT_HEALTH =
  "Provisioning stopped at this step: Verifying health. Email hello@valence.works with this engine's name and we'll help during business hours.";
const SIGNED_FAILED_GUIDANCE =
  "Setup stopped before your engine was ready. For help, email hello@valence.works.";
const LEGACY_NEEDS_ATTENTION =
  "Provisioning needs attention. Paused at this step: Verifying health. Check again or email hello@valence.works if it remains here.";

function paragraphTexts(): string[] {
  return Array.from(document.querySelectorAll("p")).map((el) => el.textContent ?? "");
}

const progress = (overrides: Partial<CloudProvisioningProgress> = {}): CloudProvisioningProgress => ({
  state: "failed",
  currentStage: "health-verification",
  startedAt: "2026-11-26T10:00:00.000Z",
  lastUpdatedAt: "2026-11-26T10:30:00.000Z",
  completedAt: null,
  diagnosticCode: null,
  stages: MANAGED_PROVISIONING_STAGE_CODES.map((code, index) => ({
    code,
    status: index < 4 ? "completed" : index === 4 ? "current" : "pending",
    startedAt: null,
    completedAt: null,
  })),
  activity: [],
  ...overrides,
});

const engine = (
  overrides: Partial<CloudEngineOverview> = {},
  restartAllowed = false,
): CloudEngineOverview => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Prod",
  slug: "prod",
  status: "Failed",
  release: null,
  health: "Unknown",
  canOpen: false,
  version: 3,
  etag: null,
  organizationId: null,
  audience: null,
  redirectUri: null,
  activeOperation: null,
  allowedActions: {
    restart: { allowed: restartAllowed, reasonCode: restartAllowed ? null : "instance.failed" },
    applyRelease: { allowed: false, reasonCode: null },
    open: { allowed: false, reasonCode: null },
    delete: { allowed: true, reasonCode: null },
  },
  ...overrides,
});

describe("CloudProvisioningTimeline failure reasons (#1011)", () => {
  it.each(Object.keys(SIGNED))("failed + %s shows the signed table and stops the spinner", (code) => {
    render(<CloudProvisioningTimeline progress={progress({ reasonCode: code })} engine={engine()} />);
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
    expect(screen.getByText(SIGNED[code])).toBeInTheDocument();
    expect(screen.getByText(NEITHER)).toBeInTheDocument();
    expect(screen.queryByText(TODAY_FAILED_AT_HEALTH)).not.toBeInTheDocument();
    expect(paragraphTexts().filter((text) => text === SIGNED[code])).toHaveLength(1);
    expect(paragraphTexts().filter((text) => text === NEITHER)).toHaveLength(1);
    expect(paragraphTexts()).not.toContain(SIGNED_FAILED_GUIDANCE);
    expect(document.querySelector(".animate-pulse")).toBeNull();
    // Current stage stays visible.
    expect(screen.getByText(provisioningStageLabels["health-verification"])).toBeInTheDocument();
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry setup|delete/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(code);
  });

  it("failed + unknown code shows the fallback line", () => {
    render(<CloudProvisioningTimeline progress={progress({ reasonCode: "provisioning.something-new" })} engine={engine()} />);
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(SIGNED["provisioning.health.crash-loop"])).not.toBeInTheDocument();
  });

  it("failed with no reasonCode shows the title and the fallback line", () => {
    render(<CloudProvisioningTimeline progress={progress()} engine={engine()} />);
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: CLOUD_PROVISIONING_HEADING })).not.toBeInTheDocument();
    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
    expect(screen.getByText(NEITHER)).toBeInTheDocument();
    expect(screen.queryByText(TODAY_FAILED_AT_HEALTH)).not.toBeInTheDocument();
    expect(paragraphTexts().filter((text) => text === FALLBACK)).toHaveLength(1);
    expect(paragraphTexts().filter((text) => text === NEITHER)).toHaveLength(1);
    expect(paragraphTexts()).not.toContain(SIGNED_FAILED_GUIDANCE);
    expect(document.querySelector(".animate-pulse")).toBeNull();
    expect(screen.getByText("Step 5 of 7")).toBeInTheDocument();
  });

  it("a parked (RecoveryRequired) engine with failed progress keeps today's parked copy", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.timeout.health" })}
        engine={engine({
          status: "RecoveryRequired",
          activeOperation: { id: "22222222-2222-4222-8222-222222222222", action: "Create", state: "RecoveryRequired" },
        })}
      />,
    );
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("a deleting engine with failed progress shows no table", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.timeout.health" })}
        engine={engine({
          status: "Deleting",
          activeOperation: { id: "22222222-2222-4222-8222-222222222222", action: "Delete", state: "Running" },
        })}
      />,
    );
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("stale with a code shows no title and keeps the needs-attention guidance", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ state: "stale", reasonCode: "provisioning.timeout.workload" })}
        engine={engine({ status: "Provisioning" })}
      />,
    );
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(SIGNED["provisioning.timeout.workload"])).not.toBeInTheDocument();
    expect(screen.queryByText(LEGACY_NEEDS_ATTENTION)).not.toBeInTheDocument();
    expect(screen.getByText(NEITHER)).toBeInTheDocument();
    expect(paragraphTexts().filter((text) => text === NEITHER)).toHaveLength(1);
    expect(paragraphTexts()).not.toContain(SIGNED_FAILED_GUIDANCE);
  });

  it("an active (retrying) snapshot with a timeout code shows no title", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ state: "active", reasonCode: "provisioning.timeout.foundation" })}
        engine={engine({
          status: "Provisioning",
          activeOperation: {
            id: "22222222-2222-4222-8222-222222222222",
            action: "Create",
            state: "Running",
            progress: {
              phase: null,
              attemptedStep: "Foundation",
              attemptNumber: 2,
              attemptStartedAt: null,
              reasonCode: "provisioning.timeout.foundation",
            },
          },
        })}
      />,
    );
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(SIGNED["provisioning.timeout.foundation"])).not.toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("a failed snapshot while a Create operation is running again shows no title", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.timeout.workload" })}
        engine={engine({
          status: "Provisioning",
          activeOperation: {
            id: "22222222-2222-4222-8222-222222222222",
            action: "Create",
            state: "Running",
          },
        })}
      />,
    );
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(TODAY_FAILED_AT_HEALTH)).not.toBeInTheDocument();
    expect(screen.getByText(SIGNED_FAILED_GUIDANCE)).toBeInTheDocument();
    expect(paragraphTexts().filter((text) => text === SIGNED_FAILED_GUIDANCE)).toHaveLength(1);
    expect(paragraphTexts().filter((text) => text === FALLBACK)).toHaveLength(0);
  });

  it("reads the code from lastOperation when progress has none", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress()}
        engine={engine({
          lastOperation: {
            action: "Create",
            state: "Failed",
            completedAt: null,
            failureCode: "instance.failed",
            reasonCode: "provisioning.health.crash-loop",
          },
        })}
      />,
    );
    expect(screen.getByText(SIGNED["provisioning.health.crash-loop"])).toBeInTheDocument();
  });

  it("shows the Retry-only row and button only when retry is explicitly allowed and wired", () => {
    const onRetrySetup = vi.fn();
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.timeout.health" })}
        engine={engine()}
        onRetrySetup={onRetrySetup}
        retrySetupAllowed
      />,
    );
    expect(screen.getByText(RETRY_ONLY)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry setup" }));
    expect(onRetrySetup).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows the Neither row when restart is allowed and a handler is wired but retry is not allowed", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.timeout.health" })}
        engine={engine({}, true)}
        onRetrySetup={vi.fn()}
      />,
    );
    expect(screen.getByText(NEITHER)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry setup" })).not.toBeInTheDocument();
  });

  it("non-failed payloads missing all new keys render as today", () => {
    render(
      <CloudProvisioningTimeline
        progress={progress({ state: "active" })}
        engine={engine({ status: "Provisioning" })}
      />,
    );
    expect(screen.getByRole("heading", { name: CLOUD_PROVISIONING_HEADING })).toBeInTheDocument();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    expect(document.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("legacy capitalised Failed progress shows the signed fallback guidance, not the table or the old interpolated line", () => {
    render(<CloudProvisioningTimeline progress={progress({ state: "Failed" })} engine={engine()} />);
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(TODAY_FAILED_AT_HEALTH)).not.toBeInTheDocument();
    expect(screen.getByText(SIGNED_FAILED_GUIDANCE)).toBeInTheDocument();
    expect(paragraphTexts().filter((text) => text === SIGNED_FAILED_GUIDANCE)).toHaveLength(1);
  });

  it.each([
    ["no reported status", undefined],
    ["a reported current status", "current"],
  ])("failure set: the stopped stage with %s reads needs attention, never in progress", (_label, reportedStatus) => {
    const stages = MANAGED_PROVISIONING_STAGE_CODES.slice(0, 4).map((code) => ({
      code,
      status: "completed",
      startedAt: null,
      completedAt: null,
    }));
    if (reportedStatus) {
      stages.push({ code: "health-verification", status: reportedStatus, startedAt: null, completedAt: null });
    }
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.timeout.health", stages })}
        engine={engine()}
      />,
    );
    expect(screen.getByRole("heading", { name: TITLE })).toBeInTheDocument();
    const row = screen.getByText(provisioningStageLabels["health-verification"]).closest("li");
    expect(row?.textContent).toContain(STAGE_STATUS_NEEDS_ATTENTION);
    expect(screen.queryByText(STAGE_STATUS_IN_PROGRESS)).not.toBeInTheDocument();
  });

  it("without a failure the current stage still reads in progress", () => {
    const stages = MANAGED_PROVISIONING_STAGE_CODES.slice(0, 4).map((code) => ({
      code,
      status: "completed",
      startedAt: null,
      completedAt: null,
    }));
    render(
      <CloudProvisioningTimeline
        progress={progress({ state: "active", stages })}
        engine={engine({ status: "Provisioning" })}
      />,
    );
    const row = screen.getByText(provisioningStageLabels["health-verification"]).closest("li");
    expect(row?.textContent).toContain(STAGE_STATUS_IN_PROGRESS);
  });

  it("failure set hides Control's unavailableReason prose", () => {
    const prose = "Control wrote this unavailable reason.";
    render(
      <CloudProvisioningTimeline
        progress={progress({ reasonCode: "provisioning.health.crash-loop" })}
        engine={engine({ unavailableReason: prose, unavailableReasonCode: "instance.failed" })}
      />,
    );
    expect(screen.getByText(SIGNED["provisioning.health.crash-loop"])).toBeInTheDocument();
    expect(screen.queryByText(prose)).not.toBeInTheDocument();
  });

  it("without a failure the unavailableReason prose still renders", () => {
    const prose = "Control wrote this unavailable reason.";
    render(
      <CloudProvisioningTimeline
        progress={progress({ state: "active" })}
        engine={engine({ status: "Provisioning", unavailableReason: prose, unavailableReasonCode: "instance.failed" })}
      />,
    );
    expect(screen.getByText(prose)).toBeInTheDocument();
  });
});
