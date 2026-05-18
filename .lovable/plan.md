## Problem

Required boolean settings currently render as a checkbox. An unticked checkbox is indistinguishable from "no choice made", so validation flags the field as missing until the user ticks it — effectively forcing the value to `true`. That's wrong: both `true` and `false` should be valid answers; the user just needs to make an explicit choice.

## Fix

Render required booleans as a Yes / No segmented control with **no preselection**. Validation passes as soon as either side is chosen. Optional booleans keep the current checkbox behavior.

### Changes in `src/components/runtime-builder/settings/editors.tsx`

1. Add a new `requiredBooleanEditor` registered **before** `booleanEditor`:
   - `match`: `s.type === "boolean" && s.required === true && s.ui?.widget !== "switch"`
   - `layout: "stacked"` so the field's normal label + required asterisk are rendered by the parent form row (consistent with other required fields).
   - Renders two `Button`s (or a shadcn `ToggleGroup` — pick whichever is already used in the builder; check `runtime-builder/settings/` neighbors) labeled "Yes" / "No".
   - `value === true` → Yes pressed; `value === false` → No pressed; `undefined` → neither pressed (invalid state, validator will flag it).
   - On click: `onChange(true)` / `onChange(false)`.
   - When neither is selected, add a subtle `text-muted-foreground` hint "Choose Yes or No" beneath the buttons so the empty state reads as intentional rather than broken.

2. Tweak `booleanEditor` (optional, non-required path) so the inline checkbox label drops the red `*` — required booleans no longer go through this editor.

3. Register order in the editors array: `booleanSwitchEditor, requiredBooleanEditor, booleanEditor, …`.

### Validator (`src/lib/runtime-builder/validate.ts`)

No change needed. The existing `v === undefined || v === null || v === ""` check already treats `false` as a valid answer and `undefined` as missing — exactly what the new editor produces.

### Defaults

Required booleans must not get a silent default. Audit `setting.defaultValue` usage for required boolean schemas in the catalog — if any required boolean ships a `defaultValue`, the editor must ignore it (otherwise the value is preselected and the "explicit choice" guarantee is lost). The new editor reads `value` directly without falling back to `defaultValue`.

## Out of scope

- Switch-widget booleans (`ui.widget === "switch"`) — keep as-is; switches are rarely marked required.
- Catalog/schema changes — `required: true` on booleans stays a valid schema declaration.

## Verification

- Find a feature with a required boolean setting (search catalog for `"type":"boolean"` + `"required":true`); confirm the form shows Yes/No with neither pressed and a "required" error until clicked.
- Confirm clicking "No" clears the validation error.
- Confirm optional booleans still render as inline checkboxes.
- `bunx tsc --noEmit` passes.
