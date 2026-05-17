# Client-side bundle download

Wire up the "Download bundle" button in `StepBundle.tsx` to package the files produced by `generateBundleFilesV2()` into a single `.zip` directly in the browser — no edge function needed.

## Changes

1. **Add dependency**
   - `bun add jszip` (and `@types/jszip` if not bundled).

2. **`src/components/runtime-builder/StepBundle.tsx`**
   - Import `JSZip`.
   - Add `downloading` state + a `downloadBundle()` async handler that:
     - Guards on `validation.isValid` (already computed).
     - Creates a `JSZip` instance, loops `files` and calls `zip.file(f.path, f.contents)`.
     - Also adds `build.json` (the same payload `ExportDialog` produces — schema `elsa-runtime-builder/v2`, timestamp, `...state`) so the zip round-trips back into Import.
     - `await zip.generateAsync({ type: "blob", compression: "DEFLATE" })`.
     - Triggers download via a temporary `<a>` with filename `elsa-deployment-<YYYYMMDD-HHmm>.zip`.
     - Shows a toast on success / failure.
   - Replace the disabled Tooltip-wrapped button with an enabled `Button` that calls `downloadBundle()`, disabled only while `downloading` or when `!validation.isValid`. Keep the existing "Resolve N errors first" helper text for the invalid case.

3. **No backend, no schema, no routing changes.** Per-file Copy/Download buttons stay as-is.

## Out of scope

- Real NuGet lockfile resolution, license gating, signed audit trail, shareable bundle URLs — all deferred to a future `runtime-builder-bundle` edge function if/when needed.
- Changing the contents produced by `generateBundleFilesV2()`.

## Verification

- Click Download with a valid build → browser saves `elsa-deployment-*.zip` containing the 6 generated files plus `build.json`.
- Unzip and confirm file paths/content match the in-app preview.
- With validation errors present, the button is disabled and the helper text appears.
