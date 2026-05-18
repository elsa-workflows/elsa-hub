// Per-browser user preferences for the Elsa Weaver chat panel. Stored in
// localStorage so they survive reloads without a backend round-trip.

import { useCallback, useEffect, useState } from "react";

export interface WeaverPreferences {
  /**
   * When true (default) and the user is on a narrow viewport, switching the
   * active thread auto-scrolls the conversation to the latest message. When
   * false, the new thread loads with the scroll position pinned to the top
   * so users can read the conversation from the beginning instead of being
   * dropped at the bottom on a small screen.
   *
   * Desktop behaviour is unchanged — this only gates the mobile experience.
   */
  mobileAutoScrollOnThreadSwitch: boolean;
}

const STORAGE_KEY = "weaver:prefs";
const DEFAULTS: WeaverPreferences = {
  mobileAutoScrollOnThreadSwitch: true,
};

function readPrefs(): WeaverPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WeaverPreferences>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function writePrefs(prefs: WeaverPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("weaver:prefs-changed"));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useWeaverPreferences() {
  const [prefs, setPrefs] = useState<WeaverPreferences>(readPrefs);

  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    window.addEventListener("weaver:prefs-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("weaver:prefs-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setPreference = useCallback(
    <K extends keyof WeaverPreferences>(key: K, value: WeaverPreferences[K]) => {
      const next = { ...readPrefs(), [key]: value };
      writePrefs(next);
      setPrefs(next);
    },
    [],
  );

  return { prefs, setPreference };
}
