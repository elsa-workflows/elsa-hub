
# Design refresh: crisp neutral, keep magenta

A site-wide visual reset toward the "Control Plane" precision aesthetic while preserving the brand's rose-magenta accent. Goal: make the product feel modern, precise, and quiet — not noisy or dated.

## Direction

- **Feel**: editorial-precise. Generous whitespace, hairline 1px borders, restrained shadows, confident typography. Less "glow and gradient", more "Linear / Vercel / Stripe".
- **Accent**: keep rose-magenta `340 90% 70%` as the *only* accent. Use it sparingly — primary CTAs, focus rings, key data points, single-word emphasis. Everything else is neutral.
- **No more**: space background, glassmorphism, drop shadows on cards by default, large rounded "pill" shapes, gradient text on body copy.

## Design tokens (index.css)

**Light mode**
- `--background` pure white `0 0% 100%`
- `--foreground` near-black `240 6% 10%`
- `--card` `0 0% 100%`, with `--border` `240 6% 90%` hairlines instead of shadows
- `--muted` `240 5% 96%`, `--muted-foreground` `240 4% 46%`
- `--primary` unchanged `340 90% 70%` (slightly deepen for AA contrast on white → `336 78% 52%`)
- `--radius` 0.5rem (down from 1.5rem) — affects buttons, cards, inputs

**Dark mode**
- `--background` `240 6% 7%` (slightly lifted from current `4%` so hairlines read)
- `--card` `240 6% 9%` flat (no glass, no blur)
- `--border` `240 5% 16%`
- `--primary` stays `340 90% 70%`
- Remove `.glass-card`, `.screenshot-frame` glow, `.btn-primary-glow`, all `space-*` and `nebula-*` animations

**Typography**
- Body: **Inter** (replaces Poppins) — tighter letter-spacing, better at small sizes
- Display: **Space Grotesk** for h1/h2 with `tracking-tight` and `-0.02em`
- Mono: keep JetBrains Mono
- Set `--font-sans` / `--font-serif` / `--font-mono` and update `tailwind.config.ts` `fontFamily`
- Drop the serif Merriweather

**Shadows**
- Replace the current shadow scale with near-flat values: `sm = 0 1px 0 hsl(var(--border))`, `md = 0 1px 2px hsl(0 0% 0% / 0.04)`, `lg = 0 8px 24px -12px hsl(0 0% 0% / 0.12)`. Use shadows only on popovers/dropdowns, not on cards.

## Component primitives

- **Button**: keep variants, lose the `btn-primary-glow` dark-mode glow. `default` uses solid primary. Add `tracking-tight font-medium`. `outline` becomes hairline border + subtle hover bg.
- **Card**: hairline border, no shadow by default, `rounded-lg` (=8px). Add `variant="ghost"` (no border, just padding) and keep `variant="glass"` as alias of default for now to avoid breakage; eventually deprecate.
- **Input / Textarea / Select**: hairline border, `rounded-md`, focus ring uses primary at 30% opacity instead of full color.
- **Badge / StatusChip**: flatter, no rounded-full pills for non-status data; use `rounded-sm` for tags, `rounded-full` only for status dots.
- **Navigation**: thinner, hairline bottom border, no backdrop blur. Logo + links + single primary CTA.

## Layout / page-level changes

**Marketing pages** (Home, Roadmap, Elsa+, Enterprise, Resources, GetStarted)
- Remove `<SpaceBackground />` from `Layout`. Background is solid `bg-background`.
- Increase section vertical rhythm to `py-24` desktop / `py-16` mobile.
- Hero: drop gradient/glow framing. Use a quiet eyebrow chip + tight display headline + single accent-colored word + one paragraph + 2 CTAs.
- Replace the hero screenshot 3D tilt with a flat hairline-framed screenshot.
- Roadmap: keep structure, restyle theme cards to hairline + ghost (no glass).

**Dashboard**
- Sidebar: flat, hairline right border, no glow on active item — active = primary text + 2px primary left accent bar.
- Header: hairline bottom border, no shadow, no blur.
- Stat cards (AdminStatsCard etc.): hairline border, big tabular-nums number in Space Grotesk, label in muted-foreground uppercase tracking-wider 11px.
- Tables: hairline rows, no zebra, hover = `bg-muted/40`.

## File-level scope

```text
src/index.css                        tokens, fonts, remove glass/space utilities
tailwind.config.ts                   radius, fonts, shadow scale
src/components/ui/button.tsx         drop glow class
src/components/ui/card.tsx           hairline default, no shadow
src/components/ui/input.tsx          quieter focus ring
src/components/ui/badge.tsx          flatter
src/components/layout/Layout.tsx     remove <SpaceBackground/>
src/components/layout/Navigation.tsx hairline, no blur
src/components/layout/Footer.tsx     hairline top, tighter spacing
src/components/dashboard/*           sidebar/header/stat-card restyle
src/pages/Home.tsx                   hero + section restyle
src/pages/Roadmap.tsx                theme cards restyle
src/pages/ElsaPlus.tsx               section restyle
src/pages/Enterprise.tsx             section restyle
src/components/space/*               leave files (unused) — delete in a follow-up
src/components/home/HeroScreenshot.tsx  flatten frame
```

Memory updates after implementation:
- Update `Core` UI/Style line: remove "Glassmorphism elements in dark mode"; replace with "Crisp neutral surfaces, hairline borders, magenta as sole accent."
- Mark `mem://style/glassmorphism-ui`, `mem://style/dark-mode-space-theme`, `mem://features/space-background/debug-tools` as deprecated.

## Out of scope

- No copy changes.
- No new pages or features.
- No changes to auth/data/RLS/edge functions.
- Space background components stay in the repo (just unmounted) to keep the diff reviewable; deleted in a follow-up PR.

## Risks

- Font swap (Poppins → Inter) shifts vertical rhythm slightly; spot-check Home, Roadmap, dashboard headers.
- Tighter radius will be visually significant on Button/Card/Input — intended.
- AA contrast on primary against white: deepen to `336 78% 52%` for light mode `--primary`, keep `340 90% 70%` for dark.

## Validation

After implementation: visit `/`, `/roadmap`, `/elsa-plus`, `/enterprise`, `/dashboard` in both light and dark modes; confirm no glass/space artefacts, hairlines render, focus rings visible, no contrast regressions.
