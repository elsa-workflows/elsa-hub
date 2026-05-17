Wire `rb.selectImage` into the Weaver approval card so the existing intent (already emitted by the edge function and applied by `runtime-builder-bridge`) renders a proper review checklist and summary instead of falling through to the default "Apply action" label.

## Changes — `src/components/weaver/WeaverToolPart.tsx`

1. **`buildChecklist` switch** — add a `case "rb.selectImage"` that:
   - Looks up the target image via `findBuilderImage(intent.slug)` (new import from `@/lib/runtime-builder/images`).
   - Reads the current `state.imageSelection` to detect no-ops and show `from → to` diffs.
   - Emits items for:
     - Image: `from = currentImage.name @ currentTag`, `to = nextImage.name @ nextTag` (tone `info`; `noop` if slug+tag+port all unchanged).
     - Tag: only when it changed (`from → to`, tone `info`).
     - Host port: only when it changed (`from → to`, tone `info`).
     - Studio companion warning: when the new image's `requiresServer` is true, add a `warn` item noting that a Server companion service will be emitted in the bundle.
   - If the image slug is unknown, return a single `warn` item.

2. **`describeIntent` switch** — add a `case "rb.selectImage"` returning:
   - `title`: `Use ${image.name}` (fallback to slug)
   - `detail`: `${intent.reason ?? image.tagline}`
   - `icon`: `Container` from `lucide-react` (add to the existing import list).

3. **Imports** — add `Container` to the `lucide-react` import and `findBuilderImage` from `@/lib/runtime-builder/images`.

No other files change. The intent type, store action, bridge handler, and edge-function tool are already in place.
