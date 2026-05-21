"use client";

import { Palette, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useThemePreferences,
  ACCENT_PRESETS,
  FONT_PRESETS,
  DARK_FLAVOR_PRESETS,
  type AccentKey,
  type FontKey,
  type DarkFlavorKey,
} from "@/contexts/ThemePreferencesContext";

export function ThemePreferences() {
  const { prefs, setAccent, setFont, setDarkFlavor, reset } = useThemePreferences();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              aria-label="Customize theme"
            >
              <Palette className="h-[1.1rem] w-[1.1rem]" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Customize theme</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Accent</h3>
            <div className="flex items-center gap-2">
              {(Object.entries(ACCENT_PRESETS) as [AccentKey, typeof ACCENT_PRESETS[AccentKey]][]).map(([key, p]) => {
                const active = prefs.accent === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAccent(key)}
                    aria-label={p.label}
                    aria-pressed={active}
                    className={`relative h-7 w-7 rounded-full border transition-transform hover:scale-110 ${
                      active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background border-transparent" : "border-border"
                    }`}
                    style={{ background: p.swatch }}
                  >
                    {active && <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Typography</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FONT_PRESETS) as [FontKey, typeof FONT_PRESETS[FontKey]][]).map(([key, p]) => {
                const active = prefs.font === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFont(key)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors hover:bg-muted ${
                      active ? "border-foreground/60 bg-muted" : "border-border"
                    }`}
                  >
                    <span className="text-lg leading-none" style={p.previewStyle}>{p.sample}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Dark flavor</h3>
            <div className="flex items-center gap-2">
              {(Object.entries(DARK_FLAVOR_PRESETS) as [DarkFlavorKey, typeof DARK_FLAVOR_PRESETS[DarkFlavorKey]][]).map(([key, p]) => {
                const active = prefs.darkFlavor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDarkFlavor(key)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted ${
                      active ? "border-foreground/60 bg-muted" : "border-border"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full border border-border" style={{ background: p.swatch }} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Saved on this device</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={reset}>
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
