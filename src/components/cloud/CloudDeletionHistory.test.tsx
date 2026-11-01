import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PREVIOUS_DELETIONS_HEADING,
  UNFINISHED_DELETE_STATE_CANCELLED,
  UNFINISHED_DELETE_STATE_DELETING,
  UNFINISHED_DELETE_STATE_NEEDS_ATTENTION,
  UNFINISHED_DELETE_STATE_UNAVAILABLE,
  formatDeletionWhen,
  type DeletionHistoryRecord,
} from "@/lib/cloud/managedEngineDeletionHistory";
import { CloudDeletionHistory } from "./CloudDeletionHistory";

const when = "2026-10-20T15:04:00.000Z";
const whenLabel = formatDeletionWhen(when);

function record(overrides: Partial<DeletionHistoryRecord> = {}): DeletionHistoryRecord {
  return {
    phase: "tracking",
    instanceId: "11111111-1111-4111-8111-111111111111",
    instanceName: "Prod",
    completedAt: when,
    state: "Succeeded",
    ...overrides,
  };
}

describe("CloudDeletionHistory", () => {
  it("shows Previous deletions and the completed sentence", () => {
    render(
      <CloudDeletionHistory
        records={[record()]}
        liveInstances={[{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", createdAt: "2026-10-21T00:00:00.000Z" }]}
      />,
    );
    expect(screen.getByText(PREVIOUS_DELETIONS_HEADING)).toBeInTheDocument();
    expect(screen.getByText(`Prod deleted on ${whenLabel}`)).toBeInTheDocument();
  });

  it("shows signed state and Requested labels on unfinished rows", () => {
    render(
      <CloudDeletionHistory
        records={[
          record({
            instanceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            completedAt: null,
            acceptedAt: when,
            state: "Failed",
          }),
          record({
            instanceId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            completedAt: null,
            acceptedAt: null,
            requestedAt: when,
            state: "Accepted",
          }),
          record({
            instanceId: "12121212-1212-4121-8121-121212121212",
            completedAt: null,
            acceptedAt: when,
            state: "WaitingForPriorOperation",
          }),
          record({
            instanceId: "13131313-1313-4131-8131-131313131313",
            completedAt: null,
            acceptedAt: when,
            state: "Queued",
          }),
          record({
            instanceId: "14141414-1414-4141-8141-141414141414",
            completedAt: null,
            acceptedAt: when,
            state: "Running",
          }),
          record({
            instanceId: "15151515-1515-4151-8151-151515151515",
            completedAt: null,
            acceptedAt: when,
            state: "EntitlementHeld",
          }),
          record({
            instanceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            completedAt: null,
            acceptedAt: when,
            state: "RecoveryRequired",
          }),
          record({
            instanceId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            completedAt: null,
            acceptedAt: when,
            state: "Cancelled",
          }),
          record({
            instanceId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            completedAt: null,
            acceptedAt: when,
            state: "Unknown",
          }),
          record({
            instanceId: "99999999-9999-4999-8999-999999999999",
            completedAt: null,
            acceptedAt: when,
            state: undefined,
          }),
          record({
            instanceId: "10101010-1010-4101-8101-101010101010",
            completedAt: null,
            acceptedAt: when,
            state: "Canceled",
          }),
        ]}
        liveInstances={[]}
      />,
    );
    expect(screen.getAllByText("Prod")).toHaveLength(11);
    expect(screen.getAllByText(`Request accepted ${whenLabel}`)).toHaveLength(10);
    expect(screen.getByText(`Requested ${whenLabel}`)).toBeInTheDocument();
    expect(screen.getAllByText(UNFINISHED_DELETE_STATE_NEEDS_ATTENTION)).toHaveLength(3);
    expect(screen.getAllByText(UNFINISHED_DELETE_STATE_DELETING)).toHaveLength(4);
    expect(screen.getByText(UNFINISHED_DELETE_STATE_CANCELLED)).toBeInTheDocument();
    expect(screen.getAllByText(UNFINISHED_DELETE_STATE_UNAVAILABLE)).toHaveLength(3);
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
    expect(screen.queryByText(/deleted on/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/deleted\.$/i)).not.toBeInTheDocument();
  });

  it("shows Deleting on a submitting row that has no state yet", () => {
    render(
      <CloudDeletionHistory
        records={[
          record({
            phase: "submitting",
            completedAt: null,
            acceptedAt: null,
            requestedAt: when,
            state: undefined,
          }),
        ]}
        liveInstances={[]}
      />,
    );
    expect(screen.getByText("Prod")).toBeInTheDocument();
    expect(screen.getByText(UNFINISHED_DELETE_STATE_DELETING)).toBeInTheDocument();
    expect(screen.queryByText(UNFINISHED_DELETE_STATE_UNAVAILABLE)).not.toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });

  it("does not render a date when a Succeeded row's last operation is not a Delete", () => {
    const createCompleted = "2026-10-01T00:00:00.000Z";
    render(
      <CloudDeletionHistory
        records={[
          record({
            completedAt: createCompleted,
            acceptedAt: null,
            requestedAt: null,
            lastOperation: { action: "Create", state: "Succeeded", completedAt: createCompleted },
          }),
        ]}
        liveInstances={[]}
      />,
    );
    expect(screen.getByText("Prod deleted.")).toBeInTheDocument();
    expect(screen.queryByText(`Prod deleted on ${formatDeletionWhen(createCompleted)}`)).not.toBeInTheDocument();
    expect(screen.queryByText(/deleted on/i)).not.toBeInTheDocument();
    expect(screen.queryByText(formatDeletionWhen(createCompleted)!)).not.toBeInTheDocument();
  });
});
