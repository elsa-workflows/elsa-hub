import { CLOUD_STRUCTURED_LOGS, type CloudActivityItem } from "@/lib/cloudClient";
import {
  CLOUD_ACTIVITY_CHANGE_REQUESTED,
  CLOUD_ACTIVITY_CHECKING_DEPLOYMENT,
  CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED,
  CLOUD_ACTIVITY_FALLBACK,
} from "@/lib/cloudClient/signedCopy";
import { isCloudSignedCopyEnabled } from "@/lib/cloudClient/signedCopyFlag";

/**
 * Signed activity copy is keyed only on diagnosticCode. The two codes arrive
 * with valence-works/elsa-control#1067 and are not shipped yet:
 *   deployment.result-unconfirmed → Deployment result not confirmed.
 *   deployment.status-checking → Checking deployment status
 * Message and severity are never used to choose a line. A missing or unmapped
 * code falls back to Change requested (lifecycle.accepted) or Engine activity.
 */
const SIGNED_ACTIVITY_BY_CODE: Record<string, string> = {
  "deployment.result-unconfirmed": CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED,
  "deployment.status-checking": CLOUD_ACTIVITY_CHECKING_DEPLOYMENT,
};

function signedActivityLabel(item: CloudActivityItem): string {
  const code = item.diagnosticCode?.trim() ?? "";
  const mapped = code ? SIGNED_ACTIVITY_BY_CODE[code] : undefined;
  if (mapped) return mapped;
  if (item.eventType === "lifecycle.accepted") return CLOUD_ACTIVITY_CHANGE_REQUESTED;
  return CLOUD_ACTIVITY_FALLBACK;
}

function activityLabel(item: CloudActivityItem): string {
  if (!isCloudSignedCopyEnabled()) return item.message ?? item.eventType;
  return signedActivityLabel(item);
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
