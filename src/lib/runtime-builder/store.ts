import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuilderState, Catalog } from "./types";
import { catalog as defaultCatalog } from "@/data/runtime-builder";
import {
  findCapability,
  findImage,
  findSchema,
  getDefaultsForSchema,
} from "./catalog-utils";

const STORAGE_KEY = "elsa-runtime-builder/v1";

const emptyState: BuilderState = {
  imageId: null,
  imageVersion: null,
  capabilityIds: [],
  settings: {},
  overrides: {},
  advancedMode: false,
};

interface ToggleResult {
  added: string[];
  removed: string[];
  blocked?: string;
}

interface BuilderStore {
  catalog: Catalog;
  state: BuilderState;
  // mutations
  reset: () => void;
  setImage: (imageId: string, version?: string) => void;
  setImageVersion: (version: string) => void;
  toggleCapability: (capabilityId: string) => ToggleResult;
  setCapabilityEnabled: (capabilityId: string, enabled: boolean) => ToggleResult;
  setSetting: (featureId: string, name: string, value: unknown) => void;
  setOverride: (packageId: string, version: string | null) => void;
  setAdvancedMode: (value: boolean) => void;
  importState: (incoming: Partial<BuilderState>) => void;
  setMeta: (meta: Partial<NonNullable<BuilderState["meta"]>>) => void;
}

function ensureFeatureDefaults(state: BuilderState, catalog: Catalog, capabilityId: string) {
  const cap = findCapability(catalog, capabilityId);
  if (!cap) return state;
  const settings = { ...state.settings };
  for (const featureRef of cap.features) {
    if (!settings[featureRef.id]) {
      const schema = findSchema(catalog, featureRef.id);
      settings[featureRef.id] = schema ? getDefaultsForSchema(schema) : {};
    }
  }
  return { ...state, settings };
}

function dropFeatureSettings(state: BuilderState, catalog: Catalog, capabilityId: string) {
  const cap = findCapability(catalog, capabilityId);
  if (!cap) return state;
  const settings = { ...state.settings };
  for (const featureRef of cap.features) {
    delete settings[featureRef.id];
  }
  return { ...state, settings };
}

export const useRuntimeBuilder = create<BuilderStore>()(
  persist(
    (set, get) => ({
      catalog: defaultCatalog,
      state: emptyState,

      reset: () => set({ state: emptyState }),

      setImage: (imageId, version) => {
        const { catalog } = get();
        const image = findImage(catalog, imageId);
        if (!image) return;
        // Drop capabilities that are no longer supported.
        const supported = new Set(image.capabilities);
        const previous = get().state;
        const keepCaps = previous.capabilityIds.filter((id) => supported.has(id));
        const droppedCaps = previous.capabilityIds.filter((id) => !supported.has(id));
        let next: BuilderState = {
          ...previous,
          imageId,
          imageVersion: version ?? image.versions[0] ?? null,
          capabilityIds: keepCaps,
        };
        for (const id of droppedCaps) {
          next = dropFeatureSettings(next, catalog, id);
        }
        set({ state: next });
      },

      setImageVersion: (version) =>
        set((s) => ({ state: { ...s.state, imageVersion: version } })),

      setCapabilityEnabled: (capabilityId, enabled) => {
        const { catalog, state } = get();
        const cap = findCapability(catalog, capabilityId);
        const result: ToggleResult = { added: [], removed: [] };
        if (!cap) return result;

        if (enabled) {
          if (state.capabilityIds.includes(capabilityId)) return result;
          // block on conflicts with currently-enabled capabilities
          for (const conflict of cap.conflicts ?? []) {
            if (state.capabilityIds.includes(conflict)) {
              result.blocked = conflict;
              return result;
            }
          }
          // auto-add dependencies
          let next = state;
          const toAdd = [capabilityId];
          for (const dep of cap.dependencies ?? []) {
            if (!next.capabilityIds.includes(dep)) {
              toAdd.push(dep);
              result.added.push(dep);
            }
          }
          next = { ...next, capabilityIds: [...next.capabilityIds, ...toAdd] };
          for (const id of toAdd) {
            next = ensureFeatureDefaults(next, catalog, id);
          }
          set({ state: next });
          return result;
        }

        // disable
        if (!state.capabilityIds.includes(capabilityId)) return result;
        let next: BuilderState = {
          ...state,
          capabilityIds: state.capabilityIds.filter((id) => id !== capabilityId),
        };
        next = dropFeatureSettings(next, catalog, capabilityId);
        // also disable capabilities that depend on this one
        for (const other of catalog.capabilities) {
          if (
            (other.dependencies ?? []).includes(capabilityId) &&
            next.capabilityIds.includes(other.id)
          ) {
            next = {
              ...next,
              capabilityIds: next.capabilityIds.filter((id) => id !== other.id),
            };
            next = dropFeatureSettings(next, catalog, other.id);
            result.removed.push(other.id);
          }
        }
        set({ state: next });
        return result;
      },

      toggleCapability: (capabilityId) => {
        const enabled = get().state.capabilityIds.includes(capabilityId);
        return get().setCapabilityEnabled(capabilityId, !enabled);
      },

      setSetting: (featureId, name, value) =>
        set((s) => ({
          state: {
            ...s.state,
            settings: {
              ...s.state.settings,
              [featureId]: {
                ...(s.state.settings[featureId] ?? {}),
                [name]: value,
              },
            },
          },
        })),

      setOverride: (packageId, version) =>
        set((s) => {
          const overrides = { ...s.state.overrides };
          if (version === null || version === "") delete overrides[packageId];
          else overrides[packageId] = version;
          return { state: { ...s.state, overrides } };
        }),

      setAdvancedMode: (value) =>
        set((s) => ({ state: { ...s.state, advancedMode: value } })),

      importState: (incoming) =>
        set(() => ({
          state: { ...emptyState, ...incoming } as BuilderState,
        })),

      setMeta: (meta) =>
        set((s) => ({
          state: {
            ...s.state,
            meta: { ...(s.state.meta ?? {}), ...meta },
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({ state: s.state }),
    },
  ),
);
