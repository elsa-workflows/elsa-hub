import { Badge } from "@/components/ui/badge";
import { ENDED_SUBSCRIPTION_STATUSES } from "@/lib/cloud/billingContract";
import { cloudPlanStatusLabel } from "@/lib/cloud/billingDisplay";

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
      </div>
    </section>
  );
}
