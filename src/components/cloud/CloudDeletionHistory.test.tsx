import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PREVIOUS_DELETIONS_HEADING,
  UNFINISHED_DELETE_STATE_DELETING,
  UNFINISHED_DELETE_STATE_FAILED,
  UNFINISHED_DELETE_STATE_NEEDS_ATTENTION,
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
            instanceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            completedAt: null,
            acceptedAt: when,
            state: "RecoveryRequired",
          }),
        ]}
        liveInstances={[]}
      />,
    );
    expect(screen.getAllByText("Prod")).toHaveLength(3);
    expect(screen.getAllByText(`Request accepted ${whenLabel}`)).toHaveLength(2);
    expect(screen.getByText(`Requested ${whenLabel}`)).toBeInTheDocument();
    expect(screen.getByText(UNFINISHED_DELETE_STATE_FAILED)).toBeInTheDocument();
    expect(screen.getByText(UNFINISHED_DELETE_STATE_DELETING)).toBeInTheDocument();
    expect(screen.getByText(UNFINISHED_DELETE_STATE_NEEDS_ATTENTION)).toBeInTheDocument();
    expect(screen.queryByText(/deleted/i)).not.toBeInTheDocument();
  });
});
