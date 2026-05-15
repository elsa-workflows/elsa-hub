# Elsa Runtime Builder

A premium, capability-first composer for assembling an Elsa runtime and previewing a Docker deployment bundle. Public single-shot use is anonymous; signed-in users additionally get saved configurations under their dashboard.

## Routes

Public:
- `/elsa-plus/runtime-builder` — Landing + entry point ("Start new build", "Load JSON", "Open recent" if signed in)
- `/elsa-plus/runtime-builder/new` — The composer (state in URL hash + localStorage)

Dashboard (signed-in only):
- `/dashboard/org/:slug/runtime-builds` — List of saved builds
- `/dashboard/org/:slug/runtime-builds/:id` — Edit a saved build (same composer, persisted)

Cross-link from `/elsa-plus/docker-images` and each image detail page ("Compose a runtime with this image →").

## Information architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│  Top bar:  Elsa Runtime Builder    [Steps · 1─2─3─4─5]   [Adv ▢] │
├──────────────────────────────────────────┬───────────────────────┤
│                                          │  Build summary        │
│   Step content (image / capabilities /   │  ─────────────────    │
│   configure / validate / bundle)         │  Image: Elsa Pro      │
│                                          │  Capabilities (4)     │
│                                          │  Validation: ✔ ready  │
│                                          │  Size ~ 312 MB        │
│                                          │  License: Pro         │
│                                          │  ─────────────────    │
│                                          │  [Import] [Export]    │
│                                          │  [Save] (signed in)   │
│                                          │  [Download bundle]    │
└──────────────────────────────────────────┴───────────────────────┘
```

The right-hand summary is persistent across all steps; on mobile it collapses into a sticky bottom sheet.

## Step-by-step UX

### Step 1 — Runtime image
Grid of rich cards (Elsa OSS, Elsa Pro Server, Elsa Pro Combined, Elsa Pro Studio, Minimal, AI Runtime). Each card: name, one-line description, icon, included capability chips, Elsa version, license-tier badge, stability badge, audience tag, estimated size. A version selector (combobox) per card. Selecting an image hard-resets downstream selections with a confirm dialog if the user already configured things.

### Step 2 — Capabilities
- Two-pane layout: left = category rail (Persistence, Messaging, AI, Observability, Auth, Scheduling, Integrations, Storage, Runtime Extensions); right = capability cards.
- Search bar + tag chips. Each card has a toggle, dependency chips, "Recommended" / "Advanced" / "Conflicts with X" badges.
- Toggling a capability auto-resolves dependencies (toast: "Also enabled: Entity Framework Core") with one-click undo.
- Conflicts surface inline ("Disable Redis Cache to enable In-Memory Runtime") and block the toggle until resolved.
- Capabilities unsupported by the chosen runtime image render disabled with a tooltip pointing to a compatible image.

### Step 3 — Configure features
- Left rail = list of enabled capabilities; right pane = schema-generated form for the selected capability.
- Forms produced from the feature `settings[]` schema: string / number / boolean / enum / nested object.
- Smart defaults pre-filled. `secret: true` fields render with masked input + "Use environment variable" toggle (writes `${VAR_NAME}` into config and adds it to `.env.example`).
- Inline validation on blur, grouped sections, "Advanced settings" collapsed by default, contextual help tooltips, copy-from-defaults button.
- Status pip per capability in the rail (untouched / valid / errors).

### Step 4 — Validate
- Validation runs continuously in the background; this step is the dedicated review.
- Three sections: Errors (block download), Warnings (recommendations), Passed checks.
- Each finding is expandable with explanation + "Fix it" deep-link that jumps to the offending field/capability.
- Optional dependency graph (collapsed by default) using a simple SVG node/edge layout — Image → Capabilities → Features.
- Deployment readiness meter (0–100%) and deployment metadata summary.

### Step 5 — Bundle preview & download
- File browser on the left (`config.json`, `packages.lock.json`, `docker-compose.yml`, `.env.example`, `README.md`); Monaco-style code viewer on the right with syntax highlighting and copy buttons.
- Files generated client-side from selections; no actual zipping in v1.
- Primary action: "Download bundle" — disabled with a popover: "Bundle generation ships next. Copy individual files for now." Secondary: "Copy all to clipboard", "Export config JSON".

## Advanced Mode

Global toggle in the top bar. When on:
- Capability cards reveal underlying feature IDs and NuGet package IDs with versions.
- Each feature gains a "Override version" combobox (validated against compatibility metadata).
- Step 5 adds tabs for `manifest.json` and a raw merged `config.json` view.
- Validation surfaces a "Why?" link on each finding showing the metadata rule that triggered it.
- A "Raw state" drawer shows the in-memory builder state (read-only JSON) for debugging.

## Import / export & saving

- Export: downloads `elsa-runtime-build.json` (versioned schema with `image`, `capabilities[]`, `featureSettings{}`, `overrides{}`, `meta`).
- Import: file picker or paste-JSON modal; validates against the loaded catalog before applying; shows a diff.
- Anonymous: builds auto-persist to `localStorage` under a generated id; "Recent builds" list on the landing page.
- Signed in: "Save" prompts for a name + optional description, writes to `runtime_builds` table; appears at `/dashboard/org/:slug/runtime-builds`.

## Visual direction

- Reuse existing Deep Noir tokens; primary rose-magenta for active states and the readiness meter.
- Glass cards on dark surfaces; subtle gradient accents on selected state; soft shadows.
- Typography: existing display + body pairing; monospace (JetBrains Mono) for IDs, versions, code, and copy-to-clipboard chips.
- Step indicator: linear progress with clickable steps once unlocked.
- Motion: 150–200ms transitions on toggles; capability card lift on hover; framer-motion `AnimatePresence` for step transitions and dependency-resolution toasts.

## States to design

- Empty: no image selected → centered illustration + "Pick a runtime image to begin".
- Empty capabilities: "No capabilities enabled yet. Try Persistence, Messaging, or AI."
- Loading: catalog skeletons (cards), validating shimmer on the readiness meter, generating-bundle progress.
- Error: catalog load failed → retry; validation incomplete → blocked-download CTA explains why.
- Conflict: red inline banner inside capability card with one-click resolution.

## Mobile / responsive

- ≤ md: step content stacks; summary becomes a bottom sticky pill that expands into a sheet on tap.
- Capability two-pane collapses to category dropdown + single-column cards.
- Configure step uses a sheet for the schema form per capability.

## Technical details

### Data layer (static mock catalog)
New folder `src/data/runtime-builder/`:
- `runtimeImages.ts` — typed list of images.
- `capabilities.ts` — capabilities with `category`, `dependencies`, `conflicts`, `runtimeImageSupport`, `features[]`.
- `featureSchemas.ts` — schemas for each feature (settings array as in the prompt).
- `compatibility.ts` — rules engine input (recommended/required/forbidden combinations).
- `index.ts` — Zod schemas + typed loaders that return Promises so the call sites are API-shaped (trivial swap to fetch later).

### State
- `useRuntimeBuilder` Zustand store: `imageId`, `imageVersion`, `capabilities: Set<string>`, `featureSettings: Record<featureId, Record<string, unknown>>`, `overrides`, `advancedMode`. Derived selectors compute resolved features, packages, validation results, generated files, estimated size.
- URL sync: hash-encoded compact state so links are shareable.
- LocalStorage persistence keyed by build id.

### Validation engine
`src/lib/runtime-builder/validate.ts` — pure function `(state, catalog) => { errors, warnings, passes }`, fully unit-testable. Runs on every state change with `useDeferredValue` to keep UI snappy.

### File generation
`src/lib/runtime-builder/generate.ts` — pure functions producing strings for each file; no zipping in v1. README is markdown-templated from selected capabilities.

### Components
`src/components/runtime-builder/`:
- `StepShell.tsx`, `Stepper.tsx`, `BuildSummary.tsx`
- `ImagePickerCard.tsx`, `CapabilityCard.tsx`, `CapabilityCatalog.tsx`
- `SchemaForm.tsx` (+ field renderers `StringField`, `BooleanField`, `EnumField`, `SecretField`, `ObjectField`)
- `ValidationPanel.tsx`, `DependencyGraph.tsx`
- `BundlePreview.tsx`, `FileViewer.tsx`
- `AdvancedToggle.tsx`, `PackageInspector.tsx`
- `ImportExportDialog.tsx`, `SaveBuildDialog.tsx`

### Saved builds (signed-in)
Single table `runtime_builds`:
- `id`, `org_id` (FK organizations), `created_by` (auth.users), `name`, `description`, `state jsonb`, `catalog_version text`, `created_at`, `updated_at`.
- RLS: members of the org can `select`/`insert`/`update`; only owners/admins can `delete` (use existing `has_org_role` helper, mirroring patterns in the org dashboard).
- New nav item "Runtime builds" under each org in the dashboard sidebar (visibility-conditional like other org items).

### Deps to add
- `zustand` (state store) — small, predictable.
- No Monaco; use the existing `<pre>` + `react-syntax-highlighter` if already present, otherwise a lightweight `<pre><code>` with token-class styling to keep bundle size down.

### Out of scope for v1 (stubbed)
- Real zip generation (button shows tooltip + still allows per-file download/copy).
- Sigil license files, cloud deployment targets, deployment presets, team sharing.
- Server-side validation/Catalog API — types are designed so the static loader can be replaced by `fetch` later without UI changes.

## Build order

1. Catalog data + Zod types + state store + validation engine (no UI).
2. Step shell, stepper, summary sidebar, routing.
3. Step 1 (image) → Step 2 (capabilities with dependency/conflict resolution).
4. Step 3 (schema-driven configure).
5. Step 4 (validation panel + readiness meter; graph stretch).
6. Step 5 (file generation + preview).
7. Advanced Mode + Import/Export.
8. Saved builds: migration + dashboard list/edit + nav entry.
9. SEO via existing `<Seo />`, sitemap entry, cross-links from docker-images pages.
