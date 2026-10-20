import { CLOUD_PROVISIONING_HEADING } from "@/lib/cloudClient";
import type { CloudProvisioningProgress } from "@/lib/cloudClient";

const STAGE_LABELS: Record<string, string> = {
  "request-accepted": "Request accepted",
  "hosting-foundation": "Hosting foundation",
  configuration: "Configuration",
  "runtime-deployment": "Runtime deployment",
  "health-verification": "Health verification",
  "traffic-routing": "Traffic routing",
  ready: "Ready",
};

export function CloudProvisioningTimeline({
  progress,
}: {
  progress?: CloudProvisioningProgress;
}) {
  const stages = progress?.stages ?? [
    { code: "request-accepted", status: "current", startedAt: null, completedAt: null },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{CLOUD_PROVISIONING_HEADING}</h2>
      <ol className="space-y-2">
        {stages.map((stage) => (
          <li
            key={stage.code}
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <span>{STAGE_LABELS[stage.code] ?? stage.code}</span>
            <span className="text-sm text-muted-foreground capitalize">{stage.status}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
