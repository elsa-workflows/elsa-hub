import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { toast } from "sonner";
import type {
  BuilderStateV2,
  CatalogV2,
  InfraKind,
  InfrastructureSelection,
  PackageSource,
  SelectedPackage,
  Strategy,
} from "./types-v2";
import { EMPTY_BUILDER_STATE_V2 } from "./types-v2";
import { isLegacyV1Snapshot } from "./migration-map";
import { applyClosure } from "./dependencies";

const STORAGE_KEY = "elsa-runtime-builder/v1"; // kept for forwards compatibility

interface BuilderStore {
  state: BuilderStateV2;
  reset: () => void;
  setAdvancedMode: (value: boolean) => void;
  setMeta: (meta: Partial<NonNullable<BuilderStateV2["meta"]>>) => void;
  importState: (incoming: Partial<BuilderStateV2>) => void;
  // image
  setImageSlug: (slug: string) => void;
  setImageTag: (tag: string) => void;
  setImageHostPort: (port: number) => void;
  setImageEnv: (key: string, value: string) => void;
  resetImageEnv: (key?: string) => void;
  // local packages drop folder
  setLocalPackagesEnabled: (enabled: boolean) => void;
  setLocalPackagesDirectory: (directoryPath: string) => void;
  // sources
  addPackageSource: (source: Omit<PackageSource, "id">) => void;
  updatePackageSource: (id: string, patch: Partial<PackageSource>) => void;
  removePackageSource: (id: string) => void;
  // packages
  togglePackage: (packageId: string, version: string, catalog?: CatalogV2 | null) => void;
  setPackageVersion: (packageId: string, version: string) => void;
  toggleFeature: (packageId: string, featureId: string, catalog?: CatalogV2 | null) => void;
  /**
   * Feature-first toggle: locates the host package automatically from the
   * catalog, adds it if missing, ticks the feature, runs dependency closure,
   * and prunes the host package if no user-selected features remain.
   */
  toggleCapability: (packageId: string, featureId: string, catalog: CatalogV2) => void;
  setFeatureSetting: (
    packageId: string,
    featureId: string,
    name: string,
    value: unknown,
  ) => void;
  // infrastructure
  setInfrastructure: (
    kind: InfraKind,
    providerId: string | null,
    strategy: Strategy,
  ) => void;
  setInfrastructureSetting: (
    kind: InfraKind,
    name: string,
    value: unknown,
  ) => void;
  upsertInfrastructure: (selection: InfrastructureSelection) => void;
}

function uid(): string {
  return (
    "src-" +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

function hydrateState(value: unknown): BuilderStateV2 {
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (v.schemaVersion === 2) {
      return {
        ...EMPTY_BUILDER_STATE_V2,
        ...(v as unknown as BuilderStateV2),
      };
    }
    if (isLegacyV1Snapshot(v)) {
      // Reset v1 builds — preview catalog data does not map cleanly to v2.
      // Surface a one-time toast so users understand why their build is gone.
      if (typeof window !== "undefined") {
        setTimeout(() => {
          toast.info("Runtime Builder reset", {
            description:
              "The builder moved to a package + infrastructure model. Your previous preview build was cleared.",
          });
        }, 100);
      }
    }
  }
  return EMPTY_BUILDER_STATE_V2;
}

const storage: PersistStorage<{ state: BuilderStateV2 }> = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { state?: { state?: unknown } } | null;
      const inner = parsed?.state?.state;
      const hydrated = hydrateState(inner);
      return { state: { state: hydrated } } as StorageValue<{ state: BuilderStateV2 }>;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

export const useRuntimeBuilder = create<BuilderStore>()(
  persist(
    (set, get) => ({
      state: EMPTY_BUILDER_STATE_V2,

      reset: () => set({ state: EMPTY_BUILDER_STATE_V2 }),

      setAdvancedMode: (value) =>
        set((s) => ({ state: { ...s.state, advancedMode: value } })),

      setMeta: (meta) =>
        set((s) => ({
          state: { ...s.state, meta: { ...(s.state.meta ?? {}), ...meta } },
        })),

      importState: (incoming) =>
        set(() => ({
          state: {
            ...EMPTY_BUILDER_STATE_V2,
            ...incoming,
            imageSelection: {
              ...EMPTY_BUILDER_STATE_V2.imageSelection,
              ...(incoming.imageSelection ?? {}),
            },
            schemaVersion: 2,
          },
        })),

      setImageSlug: (slug) =>
        set((s) => ({
          state: {
            ...s.state,
            imageSelection: { ...s.state.imageSelection, slug },
          },
        })),

      setImageTag: (tag) =>
        set((s) => ({
          state: {
            ...s.state,
            imageSelection: { ...s.state.imageSelection, tag },
          },
        })),

      setImageHostPort: (hostPort) =>
        set((s) => ({
          state: {
            ...s.state,
            imageSelection: { ...s.state.imageSelection, hostPort },
          },
        })),

      setImageEnv: (key, value) =>
        set((s) => ({
          state: {
            ...s.state,
            imageSelection: {
              ...s.state.imageSelection,
              envOverrides: {
                ...(s.state.imageSelection.envOverrides ?? {}),
                [key]: value,
              },
            },
          },
        })),

      resetImageEnv: (key) =>
        set((s) => {
          const current = s.state.imageSelection.envOverrides ?? {};
          if (!key) {
            return {
              state: {
                ...s.state,
                imageSelection: {
                  ...s.state.imageSelection,
                  envOverrides: {},
                },
              },
            };
          }
          const next = { ...current };
          delete next[key];
          return {
            state: {
              ...s.state,
              imageSelection: { ...s.state.imageSelection, envOverrides: next },
            },
          };
        }),

      addPackageSource: (source) =>
        set((s) => ({
          state: {
            ...s.state,
            packageSources: [
              ...s.state.packageSources,
              { ...source, id: uid() },
            ],
          },
        })),

      updatePackageSource: (id, patch) =>
        set((s) => ({
          state: {
            ...s.state,
            packageSources: s.state.packageSources.map((src) =>
              src.id === id ? { ...src, ...patch } : src,
            ),
          },
        })),

      removePackageSource: (id) =>
        set((s) => ({
          state: {
            ...s.state,
            packageSources: s.state.packageSources.filter((src) => src.id !== id),
          },
        })),

      togglePackage: (packageId, version, catalog) =>
        set((s) => {
          const exists = s.state.selectedPackages.find(
            (p) => p.packageId === packageId,
          );
          let nextSelected: SelectedPackage[];
          if (exists) {
            nextSelected = s.state.selectedPackages.filter(
              (p) => p.packageId !== packageId,
            );
          } else {
            const next: SelectedPackage = {
              packageId,
              version,
              selectedFeatures: [],
              settings: {},
            };
            nextSelected = [...s.state.selectedPackages, next];
          }
          const beforeIds = new Set(s.state.selectedPackages.map((p) => p.packageId));
          if (catalog) {
            nextSelected = applyClosure(catalog, nextSelected);
            const added = nextSelected.filter(
              (p) => p.autoAdded && !beforeIds.has(p.packageId),
            );
            if (added.length > 0) {
              toast.info(
                `Added ${added.length} required package${added.length === 1 ? "" : "s"}`,
                {
                  description: added
                    .slice(0, 3)
                    .map((p) => p.packageId)
                    .join(", ") + (added.length > 3 ? ` +${added.length - 3} more` : ""),
                },
              );
            }
          }
          return { state: { ...s.state, selectedPackages: nextSelected } };
        }),

      setPackageVersion: (packageId, version) =>
        set((s) => ({
          state: {
            ...s.state,
            selectedPackages: s.state.selectedPackages.map((p) =>
              p.packageId === packageId ? { ...p, version } : p,
            ),
          },
        })),

      toggleFeature: (packageId, featureId, catalog) =>
        set((s) => {
          let nextSelected = s.state.selectedPackages.map((p) => {
            if (p.packageId !== packageId) return p;
            const has = p.selectedFeatures.includes(featureId);
            const selectedFeatures = has
              ? p.selectedFeatures.filter((f) => f !== featureId)
              : [...p.selectedFeatures, featureId];
            // Removing a feature also removes its auto-flag entry.
            const autoFeatures = (p.autoFeatures ?? []).filter((f) => f !== featureId);
            const settings = { ...p.settings };
            if (has) delete settings[featureId];
            return {
              ...p,
              selectedFeatures,
              settings,
              autoFeatures: autoFeatures.length ? autoFeatures : undefined,
            };
          });
          const beforeIds = new Set(s.state.selectedPackages.map((p) => p.packageId));
          if (catalog) {
            nextSelected = applyClosure(catalog, nextSelected);
            const added = nextSelected.filter(
              (p) => p.autoAdded && !beforeIds.has(p.packageId),
            );
            if (added.length > 0) {
              toast.info(
                `Added ${added.length} required package${added.length === 1 ? "" : "s"}`,
                {
                  description: added
                    .slice(0, 3)
                    .map((p) => p.packageId)
                    .join(", ") + (added.length > 3 ? ` +${added.length - 3} more` : ""),
                },
              );
            }
          }
          return { state: { ...s.state, selectedPackages: nextSelected } };
        }),

      toggleCapability: (packageId, featureId, catalog) =>
        set((s) => {
          const existing = s.state.selectedPackages.find(
            (p) => p.packageId === packageId,
          );
          const pkg = catalog.packages.find((p) => p.id === packageId);
          if (!pkg) return s;

          let working: SelectedPackage[];
          if (!existing) {
            // Add host package as user-pinned with the feature ticked.
            working = [
              ...s.state.selectedPackages,
              {
                packageId,
                version: pkg.version,
                selectedFeatures: [featureId],
                settings: {},
              },
            ];
          } else {
            const has = existing.selectedFeatures.includes(featureId);
            const selectedFeatures = has
              ? existing.selectedFeatures.filter((f) => f !== featureId)
              : [...existing.selectedFeatures, featureId];
            const autoFeatures = (existing.autoFeatures ?? []).filter(
              (f) => f !== featureId,
            );
            const settings = { ...existing.settings };
            if (has) delete settings[featureId];

            // If unticking the last feature, drop the package entirely.
            // Closure will re-add it as auto if still required by another
            // selected capability.
            const becomesEmpty = has && selectedFeatures.length === 0;

            working = becomesEmpty
              ? s.state.selectedPackages.filter(
                  (p) => p.packageId !== packageId,
                )
              : s.state.selectedPackages.map((p) =>
                  p.packageId === packageId
                    ? {
                        ...p,
                        selectedFeatures,
                        settings,
                        autoFeatures: autoFeatures.length
                          ? autoFeatures
                          : undefined,
                      }
                    : p,
                );
          }

          const beforeIds = new Set(
            s.state.selectedPackages.map((p) => p.packageId),
          );
          const nextSelected = applyClosure(catalog, working);
          const added = nextSelected.filter(
            (p) => p.autoAdded && !beforeIds.has(p.packageId),
          );
          if (added.length > 0) {
            toast.info(
              `Added ${added.length} required package${added.length === 1 ? "" : "s"}`,
              {
                description:
                  added
                    .slice(0, 3)
                    .map((p) => p.packageId)
                    .join(", ") +
                  (added.length > 3 ? ` +${added.length - 3} more` : ""),
              },
            );
          }
          return { state: { ...s.state, selectedPackages: nextSelected } };
        }),

      setFeatureSetting: (packageId, featureId, name, value) =>
        set((s) => ({
          state: {
            ...s.state,
            selectedPackages: s.state.selectedPackages.map((p) => {
              if (p.packageId !== packageId) return p;
              const featureSettings = { ...(p.settings[featureId] ?? {}), [name]: value };
              return {
                ...p,
                settings: { ...p.settings, [featureId]: featureSettings },
              };
            }),
          },
        })),

      setInfrastructure: (kind, providerId, strategy) =>
        set((s) => {
          const existing = s.state.infrastructureSelections.find(
            (i) => i.kind === kind,
          );
          const next: InfrastructureSelection = existing
            ? { ...existing, providerId, strategy }
            : { kind, providerId, strategy, settings: {} };
          const list = existing
            ? s.state.infrastructureSelections.map((i) =>
                i.kind === kind ? next : i,
              )
            : [...s.state.infrastructureSelections, next];
          return { state: { ...s.state, infrastructureSelections: list } };
        }),

      setInfrastructureSetting: (kind, name, value) =>
        set((s) => ({
          state: {
            ...s.state,
            infrastructureSelections: s.state.infrastructureSelections.map((i) =>
              i.kind === kind
                ? { ...i, settings: { ...i.settings, [name]: value } }
                : i,
            ),
          },
        })),

      upsertInfrastructure: (selection) =>
        set((s) => {
          const exists = s.state.infrastructureSelections.some(
            (i) => i.kind === selection.kind,
          );
          const list = exists
            ? s.state.infrastructureSelections.map((i) =>
                i.kind === selection.kind ? selection : i,
              )
            : [...s.state.infrastructureSelections, selection];
          return { state: { ...s.state, infrastructureSelections: list } };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      storage,
      partialize: (s) => ({ state: s.state }),
    },
  ),
);

// Convenience hook used by step components that only need to apply auto-fill
// after the catalog loads. Imported by RuntimeBuilderComposer.
export function applyAutoFill(selections: InfrastructureSelection[]) {
  useRuntimeBuilder.setState((s) => ({
    state: { ...s.state, infrastructureSelections: selections },
  }));
}
