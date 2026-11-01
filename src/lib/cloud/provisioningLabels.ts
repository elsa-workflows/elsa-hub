import type { ManagedProvisioningActivityMessageCode, ManagedProvisioningStageCode } from "@/lib/cloud/provisioningProgress";

export const provisioningStageLabels: Record<ManagedProvisioningStageCode, string> = {
  "request-accepted": "Request accepted",
  "hosting-foundation": "Preparing hosting foundation",
  configuration: "Configuring registry, secrets, network, and database",
  "runtime-deployment": "Deploying Elsa runtime",
  "health-verification": "Verifying health",
  "traffic-routing": "Routing traffic",
  ready: "Ready",
};

export const provisioningStageDescriptions: Record<ManagedProvisioningStageCode, string> = {
  "request-accepted": "We received the request to create this engine.",
  "hosting-foundation": "Preparing the dedicated environment this engine will run in.",
  configuration: "Setting up the engine's registry, secrets, network, and database.",
  "runtime-deployment": "Installing the Elsa runtime in that environment.",
  "health-verification": "Checking that the engine is healthy before it takes traffic.",
  "traffic-routing": "Connecting the engine so you can open it.",
  ready: "The engine is ready to use.",
};

export const provisioningActivityLabels: Record<ManagedProvisioningActivityMessageCode, string> = {
  "request.accepted": "Request accepted",
  "foundation.preparing": "Preparing the hosting foundation",
  "foundation.ready": "Hosting foundation ready",
  "configuration.registry-ready": "Container registry ready",
  "configuration.secrets-ready": "Secure settings ready",
  "configuration.database-ready": "Database ready",
  "runtime.deploying": "Deploying Elsa runtime",
  "runtime.deployed": "Elsa runtime deployed",
  "health.verifying": "Checking engine health",
  "health.verified": "Engine health verified",
  "traffic.routing": "Routing traffic",
  "traffic.routed": "Traffic routed",
  "engine.ready": "Engine ready",
  "provisioning.requires-attention": "Provisioning needs attention",
  "provisioning.failed": "Provisioning stopped before completion",
  "provisioning.cancelled": "Provisioning cancelled",
};
