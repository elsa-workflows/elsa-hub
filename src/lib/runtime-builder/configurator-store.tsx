import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CatalogFeature,
  CatalogImage,
  CatalogPackage,
  ControlCatalog,
  FeatureInfraRequirement,
  PlanIntent,
} from "./control-api";

const STORAGE_KEY = "elsa-runtime-configurator-v3";

export interface FeatureRef {
  packageId: string;
  version: string;
  sourceId: string;
}

export interface ConfiguratorState {
  imageSlug: string | null;
  tag: string;
  hostPort: number;
  envOverrides: Record<string, string>;
  /** featureId -> package coordinates it came from */
  features: Record<string, FeatureRef>;
  /** featureId -> { settingName: value } */
  settings: Record<string, Record<string, unknown>>;
  /** infrastructure requirement id -> provider id */
  infrastructure: Record<string, string>;
}

export const initialConfiguratorState: ConfiguratorState = {
  imageSlug: null,
  tag: "",
  hostPort: 8080,
  envOverrides: {},
  features: {},
  settings: {},
  infrastructure: {},
};

/* ------------------------------------------------------------- selectors */

export interface FlatFeature extends CatalogFeature {
  packageId: string;
  packageDisplayName: string;
  version: string;
  sourceId: string;
  effectiveRuntimeKinds: string[];
}

function effectiveKinds(
  feature: CatalogFeature,
  versionKinds: string[],
  packageKinds: string[],
): string[] {
  if (feature.runtimeKinds.length) return feature.runtimeKinds;
  if (versionKinds.length) return versionKinds;
  return packageKinds;
}

/** Empty on either side means "no constraint" — treat as compatible. */
export function kindsCompatible(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return true;
  return a.some((k) => b.includes(k));
}

export function flattenFeatures(
  catalog: ControlCatalog | undefined,
  image: CatalogImage | null,
): FlatFeature[] {
  if (!catalog) return [];
  const out: FlatFeature[] = [];
  const seen = new Set<string>();
  for (const pkg of catalog.packages) {
    const version =
      pkg.versions.find((v) => v.version === pkg.latestVersion) ?? pkg.versions[0];
    if (!version) continue;
    for (const feature of version.features) {
      const kinds = effectiveKinds(feature, version.runtimeKinds, pkg.runtimeKinds);
      if (image && !kindsCompatible(kinds, image.runtimeKinds)) continue;
      if (seen.has(feature.featureId)) continue;
      seen.add(feature.featureId);
      out.push({
        ...feature,
        packageId: pkg.packageId,
        packageDisplayName: pkg.displayName,
        version: version.version,
        sourceId: version.source?.id ?? pkg.source?.id ?? "",
        effectiveRuntimeKinds: kinds,
      });
    }
  }
  return out.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function findImage(
  catalog: ControlCatalog | undefined,
  slug: string | null,
): CatalogImage | null {
  if (!catalog || !slug) return null;
  return catalog.images.find((i) => i.slug === slug) ?? null;
}

export function findPackageById(
  catalog: ControlCatalog | undefined,
  packageId: string,
): CatalogPackage | undefined {
  return catalog?.packages.find((p) => p.packageId === packageId);
}

/** Distinct infrastructure requirements implied by the selected features. */
export function requiredInfrastructure(
  selected: FlatFeature[],
): (FeatureInfraRequirement & { requiredBy: string[] })[] {
  const map = new Map<string, FeatureInfraRequirement & { requiredBy: string[] }>();
  for (const feature of selected) {
    for (const req of feature.infrastructure ?? []) {
      const existing = map.get(req.id);
      if (existing) {
        if (!existing.requiredBy.includes(feature.displayName)) {
          existing.requiredBy.push(feature.displayName);
        }
        existing.optional = existing.optional && req.optional;
      } else {
        map.set(req.id, { ...req, requiredBy: [feature.displayName] });
      }
    }
  }
  return [...map.values()];
}

/* --------------------------------------------------------------- intents */

export function buildIntent(
  state: ConfiguratorState,
  catalog: ControlCatalog | undefined,
): PlanIntent | null {
  const image = findImage(catalog, state.imageSlug);
  if (!image) return null;

  const byPackage = new Map<string, PlanIntent["packages"][number]>();
  for (const [featureId, ref] of Object.entries(state.features)) {
    const key = `${ref.sourceId}|${ref.packageId}|${ref.version}`;
    let entry = byPackage.get(key);
    if (!entry) {
      entry = {
        sourceId: ref.sourceId,
        packageId: ref.packageId,
        version: ref.version,
        selectedFeatures: [],
        settings: {},
      };
      byPackage.set(key, entry);
    }
    entry.selectedFeatures.push(featureId);
    for (const [name, value] of Object.entries(state.settings[featureId] ?? {})) {
      if (value === "" || value === undefined || value === null) continue;
      entry.settings[name] = value;
    }
  }

  const providers = catalog?.infrastructureProviders ?? [];
  const infrastructure = Object.entries(state.infrastructure)
    .map(([, providerId]) => providers.find((p) => p.id === providerId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      kind: p.kind,
      providerId: p.id,
      strategy: p.strategy,
      settings: {} as Record<string, unknown>,
    }));

  // Collect full source metadata so the upstream bundle/planner can bind
  // the request even when it validates `name`, `url` and `kind`.
  const sourceById = new Map<string, CatalogSource>();
  for (const pkg of catalog?.packages ?? []) {
    if (pkg.source?.id) sourceById.set(pkg.source.id, pkg.source);
    for (const v of pkg.versions) {
      if (v.source?.id) sourceById.set(v.source.id, v.source);
    }
  }

  const sources = [...new Set([...byPackage.values()].map((p) => p.sourceId))]
    .filter(Boolean)
    .map((sourceId) => {
      const source = sourceById.get(sourceId);
      return {
        sourceId,
        name: source?.name ?? null,
        url: source?.url ?? null,
        kind: source?.kind ?? null,
      };
    });

  return {
    image: {
      slug: image.slug,
      tag: state.tag || image.defaultTag,
      hostPort: state.hostPort || image.hostPort,
      envOverrides: state.envOverrides,
    },
    packages: [...byPackage.values()],
    packageSources: sources,
    infrastructure,
    localPackages: { enabled: false, directoryPath: null },
  };
}

/* --------------------------------------------------------------- context */

interface ConfiguratorContextValue {
  state: ConfiguratorState;
  setImage: (image: CatalogImage) => void;
  setTag: (tag: string) => void;
  setHostPort: (port: number) => void;
  setEnvOverride: (name: string, value: string) => void;
  toggleFeature: (feature: FlatFeature) => void;
  isFeatureSelected: (featureId: string) => boolean;
  setSetting: (featureId: string, name: string, value: unknown) => void;
  setInfrastructure: (requirementId: string, providerId: string) => void;
  reset: () => void;
}

const ConfiguratorContext = createContext<ConfiguratorContextValue | null>(null);

function load(): ConfiguratorState {
  if (typeof window === "undefined") return initialConfiguratorState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialConfiguratorState;
    return { ...initialConfiguratorState, ...(JSON.parse(raw) as ConfiguratorState) };
  } catch {
    return initialConfiguratorState;
  }
}

export function ConfiguratorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfiguratorState>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — configuration is simply not persisted */
    }
  }, [state]);

  const setImage = useCallback((image: CatalogImage) => {
    setState((s) =>
      s.imageSlug === image.slug
        ? s
        : {
            ...s,
            imageSlug: image.slug,
            tag: image.defaultTag,
            hostPort: image.hostPort || image.defaultPort,
            // Features are runtime-kind specific — drop them when the runtime changes.
            features: {},
            settings: {},
            infrastructure: {},
            envOverrides: {},
          },
    );
  }, []);

  const setTag = useCallback((tag: string) => setState((s) => ({ ...s, tag })), []);
  const setHostPort = useCallback(
    (hostPort: number) => setState((s) => ({ ...s, hostPort })),
    [],
  );
  const setEnvOverride = useCallback(
    (name: string, value: string) =>
      setState((s) => ({ ...s, envOverrides: { ...s.envOverrides, [name]: value } })),
    [],
  );

  const toggleFeature = useCallback((feature: FlatFeature) => {
    setState((s) => {
      const features = { ...s.features };
      const settings = { ...s.settings };
      if (features[feature.featureId]) {
        delete features[feature.featureId];
        delete settings[feature.featureId];
      } else {
        features[feature.featureId] = {
          packageId: feature.packageId,
          version: feature.version,
          sourceId: feature.sourceId,
        };
      }
      return { ...s, features, settings };
    });
  }, []);

  const setSetting = useCallback(
    (featureId: string, name: string, value: unknown) =>
      setState((s) => ({
        ...s,
        settings: {
          ...s.settings,
          [featureId]: { ...(s.settings[featureId] ?? {}), [name]: value },
        },
      })),
    [],
  );

  const setInfrastructure = useCallback(
    (requirementId: string, providerId: string) =>
      setState((s) => ({
        ...s,
        infrastructure: { ...s.infrastructure, [requirementId]: providerId },
      })),
    [],
  );

  const reset = useCallback(() => setState(initialConfiguratorState), []);

  const isFeatureSelected = useCallback(
    (featureId: string) => Boolean(state.features[featureId]),
    [state.features],
  );

  const value = useMemo(
    () => ({
      state,
      setImage,
      setTag,
      setHostPort,
      setEnvOverride,
      toggleFeature,
      isFeatureSelected,
      setSetting,
      setInfrastructure,
      reset,
    }),
    [
      state,
      setImage,
      setTag,
      setHostPort,
      setEnvOverride,
      toggleFeature,
      isFeatureSelected,
      setSetting,
      setInfrastructure,
      reset,
    ],
  );

  return (
    <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>
  );
}

export function useConfigurator() {
  const ctx = useContext(ConfiguratorContext);
  if (!ctx) throw new Error("useConfigurator must be used within ConfiguratorProvider");
  return ctx;
}
