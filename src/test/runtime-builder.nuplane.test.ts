import { describe, it, expect } from "vitest";
import { generateBundleFilesV2 } from "@/lib/runtime-builder/generate";
import {
  EMPTY_BUILDER_STATE_V2,
  type BuilderStateV2,
  type CatalogV2,
} from "@/lib/runtime-builder/types-v2";

const EMPTY_CATALOG: CatalogV2 = { packages: [], infrastructureProviders: [] };

function getFile(state: BuilderStateV2, path: string): string {
  const files = generateBundleFilesV2(state, EMPTY_CATALOG);
  const file = files.find((f) => f.path === path);
  if (!file) throw new Error(`missing file ${path}`);
  return file.contents;
}

function getNuplane(state: BuilderStateV2) {
  const json = JSON.parse(getFile(state, "config.json"));
  return json.Nuplane;
}

describe("Nuplane config emission", () => {
  it("always includes the 4 SharedAssemblies and Setup defaults", () => {
    const nuplane = getNuplane(EMPTY_BUILDER_STATE_V2);
    expect(nuplane.Loading.Enabled).toBe(true);
    expect(nuplane.Loading.DefaultLoadMode).toBe("HostIntegrated");
    expect(nuplane.Loading.SharedAssemblies.map((a: any) => a.Name)).toEqual([
      "CShells.Abstractions",
      "CShells.AspNetCore.Abstractions",
      "Elsa",
      "Elsa.Common",
    ]);
    expect(nuplane.Setup.AutomaticReconciliation).toBe(true);
    expect(nuplane.Setup.PollInterval).toBe("00:01:00");
  });

  it("emits nuget.org without IncludePatterns and custom feeds with pinned patterns", () => {
    const state: BuilderStateV2 = {
      ...EMPTY_BUILDER_STATE_V2,
      packageSources: [
        {
          id: "nuget",
          name: "nuget.org",
          url: "https://api.nuget.org/v3/index.json",
          protocol: "nuget-v3",
          authMode: "none",
          enabled: true,
        },
        {
          id: "feedz",
          name: "feedz.io",
          url: "https://f.feedz.io/elsa-workflows/elsa-3/nuget/index.json",
          protocol: "nuget-v3",
          authMode: "none",
          enabled: true,
        },
      ],
      selectedPackages: [
        {
          packageId: "Elsa.Persistence.EFCore.Sqlite",
          version: "3.8.0-preview",
          selectedFeatures: [],
          settings: {},
        },
        {
          packageId: "Elsa.Scheduling.Quartz.EFCore.Sqlite",
          version: "3.8.0-preview",
          selectedFeatures: [],
          settings: {},
        },
      ],
    };

    const feeds = getNuplane(state).Setup.Feeds;
    expect(feeds).toHaveLength(2);

    const nuget = feeds.find((f: any) => f.Name === "nuget.org");
    expect(nuget.ServiceIndex).toBe("https://api.nuget.org/v3/index.json");
    expect(nuget.IncludePatterns).toBeUndefined();

    const feedz = feeds.find((f: any) => f.Name === "feedz.io");
    expect(feedz.IncludePatterns).toEqual([
      "Elsa.Persistence.EFCore.Sqlite [3.8.0-preview,)",
      "Elsa.Scheduling.Quartz.EFCore.Sqlite [3.8.0-preview,)",
    ]);
  });

  it("skips disabled feeds", () => {
    const state: BuilderStateV2 = {
      ...EMPTY_BUILDER_STATE_V2,
      packageSources: [
        {
          id: "feedz",
          name: "feedz.io",
          url: "https://f.feedz.io/x/y/nuget/index.json",
          protocol: "nuget-v3",
          authMode: "none",
          enabled: false,
        },
      ],
    };
    expect(getNuplane(state).Setup.Feeds).toEqual([]);
  });

  it("prepends local-packages feed and adds a compose volume mount when enabled", () => {
    const state: BuilderStateV2 = {
      ...EMPTY_BUILDER_STATE_V2,
      localPackages: { enabled: true, directoryPath: "drop" },
    };

    const feeds = getNuplane(state).Setup.Feeds;
    expect(feeds[0]).toEqual({
      Name: "local-packages",
      DirectoryPath: "drop",
      IncludePatterns: ["*"],
      Directory: { Watch: true, DebounceWindow: "00:00:01" },
    });

    const compose = getFile(state, "docker-compose.yml");
    expect(compose).toContain("- ./drop:/app/drop");
  });

  it("does not add a volume mount when local packages are disabled", () => {
    const compose = getFile(EMPTY_BUILDER_STATE_V2, "docker-compose.yml");
    expect(compose).not.toMatch(/\/app\/packages/);
  });
});
