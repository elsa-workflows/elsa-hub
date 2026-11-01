import type { ManagedProvisioningStageCode } from "@/lib/cloud/provisioningProgress";

/** Control progress.phase values, mapped to the Hub's seven-stage stepper. */
export const CONTROL_PHASE_TO_STAGE = {
  "request-accepted": "request-accepted",
  RequestAccepted: "request-accepted",
  "hosting-foundation": "hosting-foundation",
  Foundation: "hosting-foundation",
  HostingFoundation: "hosting-foundation",
  FoundationReady: "hosting-foundation",
  configuration: "configuration",
  Configuration: "configuration",
  "runtime-deployment": "runtime-deployment",
  Workload: "runtime-deployment",
  RuntimeDeployment: "runtime-deployment",
  "health-verification": "health-verification",
  Health: "health-verification",
  HealthVerification: "health-verification",
  "traffic-routing": "traffic-routing",
  Traffic: "traffic-routing",
  TrafficRouting: "traffic-routing",
  ready: "ready",
  Ready: "ready",
} as const satisfies Record<string, ManagedProvisioningStageCode>;

export const STATUS_UNAVAILABLE_LABEL = "status unavailable";

export function mapControlPhaseToStage(
  phase?: string | null,
  attemptedStep?: string | null,
): ManagedProvisioningStageCode | null {
  const normalizedPhase = phase?.trim() ?? "";
  const normalizedStep = attemptedStep?.trim() ?? "";
  if (!normalizedPhase && !normalizedStep) return null;

  // FoundationReady plus Workload highlights the workload step.
  if (normalizedPhase === "FoundationReady" && normalizedStep === "Workload") {
    return "runtime-deployment";
  }

  if (normalizedPhase && normalizedPhase in CONTROL_PHASE_TO_STAGE) {
    return CONTROL_PHASE_TO_STAGE[normalizedPhase as keyof typeof CONTROL_PHASE_TO_STAGE];
  }
  if (normalizedStep && normalizedStep in CONTROL_PHASE_TO_STAGE) {
    return CONTROL_PHASE_TO_STAGE[normalizedStep as keyof typeof CONTROL_PHASE_TO_STAGE];
  }
  return null;
}

export function stageStatusLabel(status: string | undefined): string {
  if (!status || status === "unknown") return STATUS_UNAVAILABLE_LABEL;
  return status;
}
