import { useQuery } from "@tanstack/react-query";
import { refreshDeletionHistoryFromControl } from "@/lib/cloud/deletionHistoryRefresh";
import { readDeletionHistory } from "@/lib/cloud/deletionHistoryStore";
import {
  isSucceededDeletion,
  UNFINISHED_DELETE_STATE_DELETING,
  unfinishedDeleteStateLabel,
  type DeletionHistoryRecord,
} from "@/lib/cloud/managedEngineDeletionHistory";

const POLL_MS = 5_000;

export const DELETION_HISTORY_QUERY_KEY = ["cloud", "deletion-history"] as const;

function shouldPollDeletionHistory(records: readonly DeletionHistoryRecord[]): boolean {
  return records.some((record) =>
    record.phase === "tracking"
    && Boolean(record.operationId)
    && Boolean(record.state)
    && !isSucceededDeletion(record)
    && unfinishedDeleteStateLabel(record.state, record.phase) === UNFINISHED_DELETE_STATE_DELETING
  );
}

export function useDeletionHistory(workspaceId: string | undefined): DeletionHistoryRecord[] {
  const query = useQuery({
    queryKey: [...DELETION_HISTORY_QUERY_KEY, workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => refreshDeletionHistoryFromControl(workspaceId!),
    refetchInterval: (current) => shouldPollDeletionHistory(current.state.data ?? []) ? POLL_MS : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
  if (!workspaceId) return [];
  return query.data ?? readDeletionHistory(workspaceId);
}
