## Goal

Keep all existing entry points to the Runtime Builder, but make it unmistakable that it is a **proof-of-concept preview** running on sample data — so visitors understand the direction without expecting a working bundle download.

## Changes

### 1. New shared component: `RuntimeBuilderPreviewBanner`
`src/components/runtime-builder/PreviewBanner.tsx`

A dismissible (session-only) callout used at the top of both the landing page and the composer. Uses existing `Alert` + `Sparkles`/`FlaskConical` icon, Deep Noir tokens.

Copy (single source of truth):
> **Preview — Concept build.** The Runtime Builder is an early prototype showcasing where Elsa+ is heading. The image catalog, capabilities, and generated bundle are illustrative samples — not yet wired to real registries. Explore the flow, then [tell us what you'd want it to produce](mailto:hello@…) (or link to existing feedback channel).

### 2. "Preview" badge everywhere the builder is surfaced

Replace the current "New" badge with a **"Preview"** badge (amber/secondary variant, not primary) in:
- `src/components/layout/Footer.tsx` — Elsa+ column entry
- `src/pages/ElsaPlus.tsx` — Runtime Builder card in `runtimeAndOperations`
- `src/pages/Home.tsx` — Runtime Builder CTA
- `src/pages/enterprise/DockerImages.tsx` — top CTA + section
- `src/pages/enterprise/DockerImageDetail.tsx` — "Compose a runtime" CTA
- `src/pages/get-started/Docker.tsx` — tip box

A small reusable `<PreviewBadge />` keeps wording consistent.

### 3. Landing page (`RuntimeBuilderLanding.tsx`)
- Mount `<PreviewBanner />` at the very top of the page content.
- Update hero subhead to acknowledge the preview state ("An early look at how teams will compose Elsa runtimes…").
- Add a small "What's real today / What's coming" two-column block under the hero so visitors understand scope without digging.

### 4. Composer page (`RuntimeBuilderComposer.tsx`)
- Mount `<PreviewBanner />` directly under the sticky topbar, dismissible per session.
- Add a `Preview` chip inside the topbar next to the title.

### 5. Disable real "Export" / "Download" actions
The bundle generator currently produces files only locally, but the UI implies a real artifact. Update:
- `StepBundle.tsx` — keep file previews and "Copy to clipboard" working. Replace any "Download bundle" / "Download all" primary buttons with a disabled button labelled **"Download — coming soon"** plus a one-line explanation: *"Bundle generation will be enabled once the catalog is backed by real images."*
- `ExportDialog.tsx` — keep JSON export of the **builder state** (useful for feedback), but add a banner inside the dialog clarifying the exported config is a preview schema and may change.
- `ImportDialog.tsx` — unchanged, but add the same "preview schema" note.

### 6. SEO / discoverability
- `RuntimeBuilderLanding.tsx` `<Seo>`: append " (Preview)" to the title and update the description to mention "early concept".
- `RuntimeBuilderComposer.tsx` `<Seo>`: same treatment, plus `noindex` on the composer route (the landing page can stay indexed so the concept itself is shareable).
- `scripts/generate-sitemap.ts` / `public/sitemap.xml`: keep `/runtime-builder` (landing) in the sitemap, **remove** `/runtime-builder/new` (composer) since it's a stateful tool preview.

### 7. Memory
Add a project memory entry under `mem://features/elsa-plus/runtime-builder-preview` documenting:
- Status: public preview, sample data, no real bundle download.
- Required signals: `<PreviewBanner />`, "Preview" badge, disabled download CTAs.
- Why: protect brand expectations until catalog and generator are real.

Then update `mem://index.md` to reference it.

## Out of scope (deliberate)

- No backend wiring of the catalog (still `runtimeImages.ts`).
- No real archive/zip download.
- No auth gating — the preview stays fully public.
- No changes to validation, schema, or composer step logic.

## Files touched

New:
- `src/components/runtime-builder/PreviewBanner.tsx`
- `src/components/runtime-builder/PreviewBadge.tsx`
- `mem://features/elsa-plus/runtime-builder-preview`

Edited:
- `src/pages/enterprise/RuntimeBuilderLanding.tsx`
- `src/pages/enterprise/RuntimeBuilderComposer.tsx`
- `src/components/runtime-builder/StepBundle.tsx`
- `src/components/runtime-builder/ExportDialog.tsx`
- `src/components/runtime-builder/ImportDialog.tsx`
- `src/components/layout/Footer.tsx`
- `src/pages/ElsaPlus.tsx`
- `src/pages/Home.tsx`
- `src/pages/enterprise/DockerImages.tsx`
- `src/pages/enterprise/DockerImageDetail.tsx`
- `src/pages/get-started/Docker.tsx`
- `scripts/generate-sitemap.ts`
- `public/sitemap.xml`
- `mem://index.md`
