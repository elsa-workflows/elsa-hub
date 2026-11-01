import {
  PREVIOUS_DELETIONS_HEADING,
  deletionEngineDisplayName,
  deletionRecordClock,
  isSucceededDeletion,
  partitionDeletionRecords,
  succeededDeletionSentence,
  unfinishedDeleteStateLabel,
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
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{PREVIOUS_DELETIONS_HEADING}</h2>
          <ul className="space-y-2">
            {historyRows.map((record) => (
              <DeletionRow
                key={`${record.instanceId}-${record.completedAt ?? record.acceptedAt ?? "history"}`}
                record={record}
                liveInstances={liveInstances}
              />
            ))}
          </ul>
        </section>
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
  const clock = deletionRecordClock(record, record.lastOperation);

  if (isSucceededDeletion(record)) {
    return (
      <li className="rounded-lg border px-3 py-3 text-sm">
        <p>{succeededDeletionSentence(name, clock)}</p>
      </li>
    );
  }

  const state = unfinishedDeleteStateLabel(record.state, record.phase);

  return (
    <li className="rounded-lg border px-3 py-3 text-sm space-y-1">
      <p>{name}</p>
      <p>{clock.label}</p>
      {state && <p>{state}</p>}
    </li>
  );
}
