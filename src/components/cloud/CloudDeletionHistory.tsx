import {
  deletionEngineDisplayName,
  deletionRowText,
  isSucceededDeletion,
  partitionDeletionRecords,
  type DeletionHistoryInstance,
  type DeletionHistoryRecord,
} from "@/lib/cloud/managedEngineDeletionHistory";

export function CloudDeletionHistory({
  records,
  liveInstances,
}: {
  records: DeletionHistoryRecord[];
  liveInstances: ReadonlyArray<DeletionHistoryInstance>;
}) {
  const { livePanel, history } = partitionDeletionRecords(records, liveInstances);
  const visibleLive = livePanel.filter((record) => !isSucceededDeletion(record));
  const historyRows = [...history, ...livePanel.filter(isSucceededDeletion)];

  if (visibleLive.length === 0 && historyRows.length === 0) return null;

  return (
    <div className="space-y-6">
      {visibleLive.length > 0 && (
        <ul className="space-y-2">
          {visibleLive.map((record) => (
            <DeletionRow
              key={`${record.instanceId}-${record.acceptedAt ?? record.requestedAt ?? "live"}`}
              record={record}
              liveInstances={liveInstances}
            />
          ))}
        </ul>
      )}
      {historyRows.length > 0 && (
        <ul className="space-y-2">
          {historyRows.map((record) => (
            <DeletionRow
              key={`${record.instanceId}-${record.completedAt ?? record.acceptedAt ?? "history"}`}
              record={record}
              liveInstances={liveInstances}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DeletionRow({
  record,
  liveInstances,
}: {
  record: DeletionHistoryRecord;
  liveInstances: ReadonlyArray<DeletionHistoryInstance>;
}) {
  const liveName = liveInstances.find((instance) => instance.id === record.instanceId)?.name;
  const name = deletionEngineDisplayName({
    instanceName: record.instanceName,
    liveName,
    record,
  });

  return (
    <li className="rounded-lg border px-3 py-3 text-sm">
      <p>{deletionRowText(name, record)}</p>
    </li>
  );
}
