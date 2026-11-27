import { CLOUD_STRUCTURED_LOGS, type CloudActivityItem } from "@/lib/cloudClient";
import {
  CLOUD_ACTIVITY_CHANGE_REQUESTED,
  CLOUD_ACTIVITY_CHECKING_DEPLOYMENT,
  CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED,
  CLOUD_ACTIVITY_FALLBACK,
} from "@/lib/cloudClient/signedCopy";
import { isCloudSignedCopyEnabled } from "@/lib/cloudClient/signedCopyFlag";

/**
 * Control's ClassifyCustomerActivity writes `diagnosticCode`, `severity`, and
 * `message` onto each activity item. For the two customer messages it sets
 * diagnosticCode to null and puts the line in message:
 *   - Warning + no code → Control "Deployment status unclear…"
 *   - Informational + no code is also the empty default, so "Checking
 *     deployment status" is recognized by matching Control's classified
 *     message, then replaced with the signed constant (same bytes).
 * The signed path never renders item.message verbatim.
 */
const CONTROL_ACTIVITY_UNCLEAR_MESSAGE =
  "Deployment status unclear. We're still confirming the result.";

function signedActivityLabel(item: CloudActivityItem): string {
  const code = item.diagnosticCode?.trim() ?? "";
  const severity = item.severity?.trim();
  if (!code && severity === "Warning") {
    return CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED;
  }
  const message = item.message?.trim() ?? "";
  if (!code && message === CLOUD_ACTIVITY_CHECKING_DEPLOYMENT) {
    return CLOUD_ACTIVITY_CHECKING_DEPLOYMENT;
  }
  if (message === CONTROL_ACTIVITY_UNCLEAR_MESSAGE) {
    return CLOUD_ACTIVITY_DEPLOYMENT_RESULT_NOT_CONFIRMED;
  }
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
