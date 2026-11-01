import { Badge } from "@/components/ui/badge";
import { ENDED_SUBSCRIPTION_STATUSES } from "@/lib/cloud/billingContract";
import { cloudPlanStatusLabel } from "@/lib/cloud/billingDisplay";
import { CLOUD_PREVIEW_LIMITS_HEADING, CLOUD_PREVIEW_ONE_USER } from "@/lib/cloudClient";

export function CloudPlanBanner({
  planName,
  planStatus,
}: {
  planName: string | null;
  planStatus: string | null;
}) {
  const hasPlan = Boolean(planName && planStatus && !ENDED_SUBSCRIPTION_STATUSES.includes(planStatus));
  if (!hasPlan) return null;

  return (
    <section
      aria-label="Cloud plan"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
    >
      <div className="space-y-1">
        <p className="font-semibold">{planName}</p>
        <Badge variant="default">{cloudPlanStatusLabel(planStatus)}</Badge>
        <p className="text-sm font-medium">{CLOUD_PREVIEW_LIMITS_HEADING}</p>
        <p className="text-sm text-muted-foreground">{CLOUD_PREVIEW_ONE_USER}</p>
      </div>
    </section>
  );
}
