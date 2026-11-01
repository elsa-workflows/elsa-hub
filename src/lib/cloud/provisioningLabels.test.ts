import { describe, expect, it } from "vitest";
import {
  provisioningActivityLabels,
  provisioningStageDescriptions,
  provisioningStageLabels,
} from "./provisioningLabels";

describe("provisioningLabels", () => {
  it("keeps stage labels byte-identical to the signed source", () => {
    expect(provisioningStageLabels).toEqual({
      "request-accepted": "Request accepted",
      "hosting-foundation": "Preparing hosting foundation",
      configuration: "Configuring registry, secrets, network, and database",
      "runtime-deployment": "Deploying Elsa runtime",
      "health-verification": "Verifying health",
      "traffic-routing": "Routing traffic",
      ready: "Ready",
    });
  });

  it("keeps all seven stage descriptions byte-identical to the signed source", () => {
    expect(provisioningStageDescriptions).toEqual({
      "request-accepted": "We received the request to create this engine.",
      "hosting-foundation": "Preparing the dedicated environment this engine will run in.",
      configuration: "Setting up the engine's registry, secrets, network, and database.",
      "runtime-deployment": "Installing the Elsa runtime in that environment.",
      "health-verification": "Checking that the engine is healthy before it takes traffic.",
      "traffic-routing": "Connecting the engine so you can open it.",
      ready: "The engine is ready to use.",
    });
  });

  it("keeps activity labels byte-identical to the signed source", () => {
    expect(provisioningActivityLabels["provisioning.requires-attention"]).toBe("Provisioning needs attention");
    expect(provisioningActivityLabels["engine.ready"]).toBe("Engine ready");
    expect(Object.keys(provisioningActivityLabels)).toHaveLength(16);
  });
});
