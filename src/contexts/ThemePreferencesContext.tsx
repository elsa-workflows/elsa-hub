import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AccentKey = "magenta" | "indigo" | "emerald" | "amber" | "slate";
export type FontKey = "inter-sora" | "geist" | "manrope-sora" | "jetbrains-inter";
export type DarkFlavorKey = "anthracite" | "noir" | "slate";

export interface ThemePreferences {
  accent: AccentKey;
  font: FontKey;
  darkFlavor: DarkFlavorKey;
}

export const DEFAULT_PREFS: ThemePreferences = {
  accent: "magenta",
  font: "inter-sora",
  darkFlavor: "anthracite",
};

export const ACCENT_PRESETS: Record<AccentKey, { label: string; swatch: string }> = {
  magenta:  { label: "Magenta",  swatch: "hsl(336 78% 48%)" },
  indigo:   { label: "Indigo",   swatch: "hsl(243 75% 58%)" },
  emerald:  { label: "Emerald",  swatch: "hsl(160 70% 38%)" },
  amber:    { label: "Amber",    swatch: "hsl(32 95% 50%)"  },
  slate:    { label: "Slate",    swatch: "hsl(215 25% 45%)" },
};

export const FONT_PRESETS: Record<FontKey, { label: string; sample: string; previewStyle: React.CSSProperties }> = {
  "inter-sora":     { label: "Inter + Sora",        sample: "Aa",  previewStyle: { fontFamily: "'Sora', sans-serif" } },
  "geist":          { label: "Geist",               sample: "Aa",  previewStyle: { fontFamily: "'Geist', sans-serif" } },
  "manrope-sora":   { label: "Manrope + Sora",      sample: "Aa",  previewStyle: { fontFamily: "'Manrope', sans-serif" } },
  "jetbrains-inter":{ label: "JetBrains + Inter",   sample: "Aa",  previewStyle: { fontFamily: "'JetBrains Mono', monospace" } },
};

export const DARK_FLAVOR_PRESETS: Record<DarkFlavorKey, { label: string; swatch: string }> = {
  anthracite: { label: "Anthracite", swatch: "hsl(30 6% 9%)"  },
  noir:       { label: "Noir",       swatch: "hsl(0 0% 5%)"   },
  slate:      { label: "Cool Slate", swatch: "hsl(215 18% 11%)" },
};

const STORAGE_KEY = "elsa.theme.prefs";

function readStoredPrefs(): ThemePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      accent: ACCENT_PRESETS[parsed.accent as AccentKey] ? parsed.accent : DEFAULT_PREFS.accent,
      font: FONT_PRESETS[parsed.font as FontKey] ? parsed.font : DEFAULT_PREFS.font,
      darkFlavor: DARK_FLAVOR_PRESETS[parsed.darkFlavor as DarkFlavorKey] ? parsed.darkFlavor : DEFAULT_PREFS.darkFlavor,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyToDom(prefs: ThemePreferences) {
  const root = document.documentElement;
  root.setAttribute("data-accent", prefs.accent);
  root.setAttribute("data-font", prefs.font);
  root.setAttribute("data-dark-flavor", prefs.darkFlavor);
}

interface Ctx {
  prefs: ThemePreferences;
  setAccent: (a: AccentKey) => void;
  setFont: (f: FontKey) => void;
  setDarkFlavor: (d: DarkFlavorKey) => void;
  reset: () => void;
}

const ThemePreferencesContext = createContext<Ctx | null>(null);

export function ThemePreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePreferences>(() => readStoredPrefs());

  useEffect(() => {
    applyToDom(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const value: Ctx = {
    prefs,
    setAccent: (accent) => setPrefs((p) => ({ ...p, accent })),
    setFont: (font) => setPrefs((p) => ({ ...p, font })),
    setDarkFlavor: (darkFlavor) => setPrefs((p) => ({ ...p, darkFlavor })),
    reset: () => setPrefs(DEFAULT_PREFS),
  };

  return (
    <ThemePreferencesContext.Provider value={value}>{children}</ThemePreferencesContext.Provider>
  );
}

export function useThemePreferences() {
  const ctx = useContext(ThemePreferencesContext);
  if (!ctx) throw new Error("useThemePreferences must be used within ThemePreferencesProvider");
  return ctx;
}
