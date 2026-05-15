import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { toast } from "sonner";
import type {
  BuilderStateV2,
  InfraKind,
  InfrastructureSelection,
  PackageSource,
  SelectedPackage,
  Strategy,
} from "./types-v2";
import { EMPTY_BUILDER_STATE_V2 } from "./types-v2";
import { isLegacyV1Snapshot } from "./migration-map";

const STORAGE_KEY = "elsa-runtime-builder/v1"; // kept for forwards compatibility

interface BuilderStore {
  state: BuilderStateV2;
  reset: () => void;
  setAdvancedMode: (value: boolean) => void;
  setMeta: (meta: Partial<NonNullable<BuilderStateV2["meta"]>>) => void;
  importState: (incoming: Partial<BuilderStateV2>) => void;
  // sources
  addPackageSource: (source: Omit<PackageSource, "id">) => void;
  updatePackageSource: (id: string, patch: Partial<PackageSource>) => void;
  removePackageSource: (id: string) => void;
  // packages
  togglePackage: (packageId: string, version: string) => void;
  setPackageVersion: (packageId: string, version: string) => void;
  toggleFeature: (packageId: string, featureId: string) => void;
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
          state: { ...EMPTY_BUILDER_STATE_V2, ...incoming, schemaVersion: 2 },
        })),

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

      togglePackage: (packageId, version) =>
        set((s) => {
          const exists = s.state.selectedPackages.find(
            (p) => p.packageId === packageId,
          );
          if (exists) {
            return {
              state: {
                ...s.state,
                selectedPackages: s.state.selectedPackages.filter(
                  (p) => p.packageId !== packageId,
                ),
              },
            };
          }
          const next: SelectedPackage = {
            packageId,
            version,
            selectedFeatures: [],
            settings: {},
          };
          return {
            state: {
              ...s.state,
              selectedPackages: [...s.state.selectedPackages, next],
            },
          };
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

      toggleFeature: (packageId, featureId) =>
        set((s) => ({
          state: {
            ...s.state,
            selectedPackages: s.state.selectedPackages.map((p) => {
              if (p.packageId !== packageId) return p;
              const has = p.selectedFeatures.includes(featureId);
              const selectedFeatures = has
                ? p.selectedFeatures.filter((f) => f !== featureId)
                : [...p.selectedFeatures, featureId];
              const settings = { ...p.settings };
              if (has) delete settings[featureId];
              return { ...p, selectedFeatures, settings };
            }),
          },
        })),

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
