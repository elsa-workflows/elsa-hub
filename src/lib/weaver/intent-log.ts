// Lightweight observable log of Weaver intent activity so users can see
// when capability/settings intents start, apply, and finish in the builder.

import { create } from "zustand";

export type IntentLogPhase = "start" | "applied" | "error" | "info";

export interface IntentLogEntry {
  id: string;
  ts: number;
  kind: string;
  phase: IntentLogPhase;
  message: string;
}

interface IntentLogState {
  entries: IntentLogEntry[];
  log: (e: Omit<IntentLogEntry, "id" | "ts">) => string;
  update: (id: string, patch: Partial<Omit<IntentLogEntry, "id">>) => void;
  clear: () => void;
}

const MAX_ENTRIES = 50;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `l-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export const useIntentLog = create<IntentLogState>((set) => ({
  entries: [],
  log: (e) => {
    const id = newId();
    set((s) => ({
      entries: [{ id, ts: Date.now(), ...e }, ...s.entries].slice(0, MAX_ENTRIES),
    }));
    return id;
  },
  update: (id, patch) =>
    set((s) => ({
      entries: s.entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch, ts: Date.now() } : entry,
      ),
    })),
  clear: () => set({ entries: [] }),
}));

export function logIntent(e: Omit<IntentLogEntry, "id" | "ts">): string {
  return useIntentLog.getState().log(e);
}

export function updateIntentLog(
  id: string,
  patch: Partial<Omit<IntentLogEntry, "id">>,
) {
  useIntentLog.getState().update(id, patch);
}
