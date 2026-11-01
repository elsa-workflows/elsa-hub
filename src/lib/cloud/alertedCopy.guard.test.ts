import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PARKED_DELETE_GUIDANCE_WITH_REFERENCE,
  PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE,
  PARKED_ENGINE_GUIDANCE_WITH_REFERENCE,
  PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE,
} from "./parkedGuidance";
import { stateGuidance } from "./stateGuidance";
import { provisioningActivityLabels, provisioningStageDescriptions, provisioningStageLabels } from "./provisioningLabels";

const here = dirname(fileURLToPath(import.meta.url));

const CONSOLE_COPY_FILES = [
  "parkedGuidance.ts",
  "stateGuidance.ts",
  "provisioningLabels.ts",
  "managedEngineDeletionHistory.ts",
  join("..", "..", "components", "cloud", "CloudProvisioningTimeline.tsx"),
];

describe("alerted copy stays off", () => {
  it("does not render alerted or You don't need to do anything", () => {
    const signed = [
      ...Object.values(provisioningStageLabels),
      ...Object.values(provisioningStageDescriptions),
      ...Object.values(provisioningActivityLabels),
      PARKED_ENGINE_GUIDANCE_WITH_REFERENCE,
      PARKED_ENGINE_GUIDANCE_WITHOUT_REFERENCE,
      PARKED_DELETE_GUIDANCE_WITH_REFERENCE,
      PARKED_DELETE_GUIDANCE_WITHOUT_REFERENCE,
      stateGuidance({
        state: "stale",
        currentStage: null,
        startedAt: null,
        lastUpdatedAt: null,
        completedAt: null,
        diagnosticCode: "provisioning.requires-attention",
        stages: [],
        activity: [],
      }, false) ?? "",
    ].join("\n");

    const sources = CONSOLE_COPY_FILES.map((file) => readFileSync(join(here, file), "utf8")).join("\n");
    const haystack = `${signed}\n${sources}`;
    expect(haystack).not.toMatch(/alerted/i);
    expect(haystack).not.toMatch(/You don't need to do anything/);
  });
});
