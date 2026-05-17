# Add a Docker image selection step to the Runtime Builder

The bundle generator currently hardcodes `elsaworkflows/elsa-server:latest` in `generate.ts`. The user-facing catalog of real images already lives in `src/data/dockerImages.ts` (Elsa Pro Server, Elsa Pro Studio, Elsa Pro Combined). We'll add a first-class **Image** step that drives which image, port, env vars, and compose service the generated bundle uses.

## Data source

Reuse `src/data/dockerImages.ts` as-is — no new JSON file. It already has everything we need (`image`, `hostPort`, `defaultPort`, `containerName`, `composeService`, `envVars`, `requiresServer`, `needsSharedNetwork`).

Add a small derived list `RUNTIME_BUILDER_IMAGES` (in `src/lib/runtime-builder/images.ts`) that:
- Re-exports the three `DockerImage` entries marked as eligible for the builder.
- Maps each to a builder-friendly shape: `{ slug, name, image, tag, role: "server" | "studio" | "combined", defaultHostPort, envDefaults, requiresServer, needsSharedNetwork }`.
- Provides `DEFAULT_IMAGE_SLUG = "elsa-pro-combined"` (best out-of-box experience).

## State

Extend `BuilderStateV2` (`src/lib/runtime-builder/types-v2.ts`):

```ts
imageSelection: {
  slug: string;            // dockerImages.ts slug
  tag: string;             // default "latest"
  hostPort: number;        // editable
};
```

- Add to `EMPTY_BUILDER_STATE_V2` with `slug: DEFAULT_IMAGE_SLUG`, `tag: "latest"`, `hostPort: 8080`.
- Add store actions: `setImageSlug`, `setImageTag`, `setImageHostPort`.
- Reset clears back to defaults.
- Import/Export round-trips it (already automatic via `...state` spread).

## New step UI

New component `src/components/runtime-builder/StepImage.tsx`:
- Three cards (Server / Studio / Combined) with icon, tagline, tags badge ("Requires Server" badge for Studio).
- Selected card highlighted (matching existing capability-card styling).
- Editable Tag input (default `latest`) and Host Port input.
- Inline note when the user picks **Studio** alone, warning that a server image must also be deployed alongside (matches `requiresServer` flag) — informational only, no blocking.

## Wizard integration

`src/pages/enterprise/RuntimeBuilderComposer.tsx`:
- Insert `image` as **step 1** in both `BASIC_STEPS` and `ADVANCED_STEPS`, renumbering the rest.
  - Basic: Image → Capabilities → Infrastructure → Configure → Validate → Bundle
  - Advanced: Image → Sources → Packages → Features → Infrastructure → Configure → Validate → Bundle
- Image is always unlocked (it has a sensible default, so this is just confirmation/refinement).
- Adjust `furthestUnlocked` so the existing "needs features" gates still apply to subsequent steps.
- Render `<StepImage />` when `activeKey === "image"`.

## Generator changes

`src/lib/runtime-builder/generate.ts` → `buildDockerCompose`:
- Replace the hardcoded `elsaworkflows/elsa-server:latest` block with a lookup of `state.imageSelection`:
  - Service name = `dockerImage.composeService` parsed (currently a hand-written YAML block) — refactor to build the service programmatically from `{ image: "${img}:${tag}", containerName, ports: [hostPort:defaultPort], environment, healthcheck }` so the chosen tag/port flow through.
  - Merge `envForElsa` (existing infrastructure-derived envs) on top of the image's own required `envVars` defaults (only emit keys not already provided by infra mapping).
- `BuildSummary.tsx` (sidebar): add an "Image" row showing `image:tag` so it's visible across all steps.
- `packages.lock.json` and `README.md`: include the chosen image.
- `.env.example`: include placeholder lines for any **required** env vars from `dockerImage.envVars` that don't get a value from infrastructure.

Studio-specific quirk: when the selected image is `elsa-pro-studio`, also emit the Server compose service alongside it (mirroring `studioComposeService` + an implicit server entry), so the bundle is runnable. Document this in the README. If we want to keep scope small, we can instead emit only Studio plus a clear README note — flag below.

## Weaver bridge

`src/lib/weaver/intents.ts` + `runtime-builder-bridge.ts`:
- Add an `rb.selectImage` intent (`{ slug, tag?, hostPort? }`) so Weaver can propose image changes the same way it proposes packages/capabilities.
- Add to the checklist renderer in `src/components/weaver/WeaverToolPart.tsx` (`describeIntent` + `buildChecklist`) with the same before/after diff pattern.
- Update the system prompt in `supabase/functions/weaver-chat/index.ts` to document the new tool.

## Out of scope (for this pass)

- Adding more images than the three already in `dockerImages.ts`.
- Custom registry / private image pulls (auth secrets).
- Multi-image stacks beyond the Studio-needs-Server combination.

## Verification

- Default state produces a bundle whose `docker-compose.yml` references `valenceworks/elsa-pro-combined:latest` on host port 8080.
- Switching to **Server** changes the compose `image:`, container name, and exposes 8080; switching to **Studio** additionally adds the server service and a Studio note in README.
- Changing the tag (e.g. `3.8.0-preview`) flows through compose + README + packages.lock.json.
- Round-trip: export → import restores the same selection.
- Weaver can say "use the Studio image at tag 3.8.0-preview" → approval card lists `image: combined:latest → studio:3.8.0-preview` and confirming applies it.

## Open question

Should picking **Studio** alone auto-include a Server service in `docker-compose.yml` (recommended for a runnable bundle), or just emit Studio + a README warning? Default plan above: auto-include Server. Confirm if you'd rather keep Studio-only.
