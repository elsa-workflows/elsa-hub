import { CLOUD_STRUCTURED_LOGS, type CloudActivityItem } from "@/lib/cloudClient";
import {
  CLOUD_ACTIVITY_CHANGE_REQUESTED,
  CLOUD_ACTIVITY_FALLBACK,
} from "@/lib/cloudClient/signedCopy";
import { isCloudSignedCopyEnabled } from "@/lib/cloudClient/signedCopyFlag";

function activityLabel(item: CloudActivityItem): string {
  if (!isCloudSignedCopyEnabled()) return item.message ?? item.eventType;
  // Control already classifies `message` for customers (not raw operator prose).
  // The signed table is `item.message ?? item.eventType`: keep the message when
  // present, and never fall back to a raw eventType.
  const message = item.message?.trim();
  if (message) return message;
  if (item.eventType === "lifecycle.accepted") return CLOUD_ACTIVITY_CHANGE_REQUESTED;
  return CLOUD_ACTIVITY_FALLBACK;
}

export function CloudActivityLog({ items }: { items: CloudActivityItem[] }) {
  return (
    <section id="structured-logs" className="space-y-3 scroll-mt-24">
      <h2 className="text-lg font-semibold">{CLOUD_STRUCTURED_LOGS}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.sequence} className="rounded-lg border px-3 py-2 text-sm">
              <p className="font-medium">{activityLabel(item)}</p>
              <p className="text-muted-foreground">{item.occurredAt}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
