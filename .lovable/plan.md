# Personal theme picker

Lets each user pick from a small curated set of accent colors, font pairings, and dark-mode flavors. Choices persist per user and apply across the whole app (marketing + dashboard). Canonical brand stays the default — so first-time visitors and signed-out users still see the real Elsa Workflows identity.

## What the user gets

A small palette icon button next to the existing dark-mode toggle in the nav. Clicking it opens a popover with three sections:

1. **Accent** — 5 swatches (Magenta default, Indigo, Emerald, Amber, Slate). Click to apply instantly.
2. **Typography** — 4 font pair cards (Inter + Space Grotesk default, Geist, Manrope + Sora, JetBrains Mono + Inter). Renders a tiny preview using the actual fonts.
3. **Dark flavor** — 3 chips (Anthracite default, True Noir, Cool Slate). Only affects the dark palette.

A "Reset to default" link at the bottom restores the canonical brand.

## How it works

- A new `ThemePreferencesProvider` wraps the app inside the existing `next-themes` ThemeProvider. It holds `{ accent, fontPair, darkFlavor }`, reads/writes `localStorage` under `elsa.theme.prefs`, and exposes a setter.
- On mount and on every change, it sets a `data-accent`, `data-font`, and `data-dark-flavor` attribute on `<html>`. Token overrides are written as CSS-only rules — no runtime style injection.
- A pre-hydration script in `index.html` (same pattern as the FOUC-prevention script already in the project) reads localStorage and applies these attributes before paint, so no flash on reload.
- `src/index.css` gains scoped overrides:
  - `[data-accent="indigo"] { --primary: 240 80% 55%; --ring: 240 80% 55%; }` etc.
  - `[data-font="geist"] { --font-sans: 'Geist', …; --font-display: 'Geist', …; }` etc.
  - `[data-dark-flavor="noir"].dark { --background: 0 0% 4%; --card: 0 0% 7%; … }` etc.
- Fonts are loaded via Google Fonts `@import` (matching the existing pattern at the top of `index.css`). Only the curated set — no dynamic font loading.
- New component `src/components/ui/theme-preferences.tsx` renders the popover. Uses existing shadcn `Popover`, `Button`, `Tabs` primitives. Hairline borders, no new visual language.
- Mounted next to `<ThemeToggle />` in `src/components/layout/Navigation.tsx` (desktop + mobile).

## Brand guardrails

- Default state for everyone (logged in or not, first visit or returning with cleared storage) is the canonical brand: magenta accent, Inter + Space Grotesk, warm anthracite.
- The picker is purely additive — every preset is opt-in.
- I'll update the project memory's Core rule to allow user-opt-in theme overrides while keeping canonical brand as the default. The existing "magenta as sole accent" rule becomes "magenta is the default accent; users may opt into curated alternates."

## Out of scope (for this iteration)

- No DB persistence — localStorage only. Easy to upgrade later by syncing to a `user_preferences` table.
- No custom hex picker, no free font input.
- No per-org branding — that's a separate feature.
- Marketing pages are not locked off from the picker (per your answer), but since defaults are canonical brand, anonymous visitors always see the real identity.

## Files touched

- **New** `src/contexts/ThemePreferencesContext.tsx` — provider + hook
- **New** `src/components/ui/theme-preferences.tsx` — popover UI
- **Edit** `src/index.css` — `[data-accent]`, `[data-font]`, `[data-dark-flavor]` blocks + extra font imports
- **Edit** `index.html` — pre-hydration script to apply attributes before paint
- **Edit** `src/components/layout/Navigation.tsx` — mount the picker next to `ThemeToggle`
- **Edit** `mem://index.md` Core rule — soften the magenta-only constraint to "default, with opt-in alternates"

No database, no edge functions, no new dependencies.
