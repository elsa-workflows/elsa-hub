import { CLOUD_STRUCTURED_LOGS, type CloudActivityItem } from "@/lib/cloudClient";

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
              <p className="font-medium">{item.message ?? item.eventType}</p>
              <p className="text-muted-foreground">{item.occurredAt}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
