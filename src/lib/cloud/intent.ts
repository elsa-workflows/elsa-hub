import type { CloudEngineCreateIntent, CloudOnboardingOptions, CloudReleaseOption } from "./actions";

export function slugifyEngineName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
}

export function onboardingChoices(options: CloudOnboardingOptions | undefined): CloudReleaseOption[] {
  if (!options) return [];
  const entries = [
    ...options.releases.map((entry) => ({ ...entry, previewManifestDigest: null as string | null })),
    ...options.previewReleases
      .filter((entry) => !!entry.previewManifestDigest && /^sha256:[0-9a-f]{64}$/.test(entry.previewManifestDigest))
      .map((entry) => ({ ...entry, previewManifestDigest: entry.previewManifestDigest })),
  ];
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = [
      entry.distributionId,
      entry.releaseLine,
      entry.version,
      entry.channel,
      entry.topologyId,
    ].join("|");
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap((group) => {
    const supported = group.find((entry) => entry.previewManifestDigest == null);
    if (supported) return [supported];
    return group.every((entry) => entry.previewManifestDigest === group[0].previewManifestDigest)
      ? [group[0]]
      : [];
  });
}

export function buildCreateEngineIntent(
  selected: CloudReleaseOption,
  options: CloudOnboardingOptions,
): CloudEngineCreateIntent {
  return {
    release: {
      distributionId: selected.distributionId,
      releaseLine: selected.releaseLine,
      requestedVersion: selected.version,
      channel: selected.channel,
      patchUpdates: "automatic-within-minor",
      minorUpdates: "explicit-approval",
      majorMigrations: "explicit-migration",
      ...(selected.previewManifestDigest
        ? { previewManifestDigest: selected.previewManifestDigest }
        : {}),
    },
    application: {
      topologyId: selected.topologyId,
      featurePresetId: null,
      featureOverrides: {},
      packagePolicy: null,
      configurationShapeRevisionId: null,
    },
    placement: {
      targetMode: options.launchProfile.targetMode,
      regionCode: options.launchProfile.regionCode,
      isolationProfile: options.launchProfile.isolationProfile,
      capacityProfile: options.launchProfile.capacityProfile,
      networkOutcome: options.launchProfile.networkOutcome,
      domainOutcome: options.launchProfile.domainOutcome,
    },
    desiredLifecycle: "Running",
  };
}
