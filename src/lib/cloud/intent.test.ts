import { describe, expect, it } from "vitest";
import { buildCreateEngineIntent, onboardingChoices, slugifyEngineName } from "./intent";
import type { CloudOnboardingOptions } from "./actions";

const options: CloudOnboardingOptions = {
  releases: [{
    distributionId: "valence-runtime",
    releaseLine: "3.8",
    version: "3.8.4",
    channel: "stable",
    topologyId: "combined",
  }],
  previewReleases: [],
  launchProfile: {
    name: "West Europe Dedicated",
    description: "Managed hosting in West Europe.",
    targetMode: "managed",
    regionCode: "westeurope",
    isolationProfile: "dedicated",
    capacityProfile: "standard-small",
    networkOutcome: "public",
    domainOutcome: "managed",
  },
};

describe("create intent helpers", () => {
  it("slugifies an engine name", () => {
    expect(slugifyEngineName("My Engine")).toBe("my-engine");
  });

  it("builds a create intent from the first onboarding choice", () => {
    const [selected] = onboardingChoices(options);
    expect(buildCreateEngineIntent(selected, options).desiredLifecycle).toBe("Running");
    expect(buildCreateEngineIntent(selected, options).release.requestedVersion).toBe("3.8.4");
  });
});
