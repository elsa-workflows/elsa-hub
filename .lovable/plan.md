## Goal

Replace the single text-input editor used for feature settings with a small, extensible **editor framework** that dispatches on the API's `jsonType` (and future UI hint fields). First concrete win: render booleans as a checkbox with the setting name as its label.

## Current state

- `runtime-builder-catalog` returns settings with a `jsonType` field. The normalizer in `src/lib/runtime-builder/catalog-client.ts` (`normalizeFeature`, line 67) currently passes the raw `settings` array through as-is, so `jsonType` never reaches the UI.
- `SettingSchema` (`src/lib/runtime-builder/types-v2.ts`) uses an internal `type: "string" | "number" | "boolean" | "enum" | "object"`.
- `SchemaField.tsx` switches on `setting.type` with an inline if-chain (boolean → Switch, number → Input, enum → Select, else → string). Because nothing maps `jsonType → type`, every API-sourced setting falls through to the string Input.
- `StepConfigure.tsx` renders settings in a 2-col grid and already has a small special case for boolean layout. It will use whatever editor `SchemaField` returns.

## Approach

### 1. Normalize the API shape

In `catalog-client.ts`, add a `normalizeSetting` (used by `normalizeFeature`) that:

- Maps `jsonType` → internal `type`:
  - `"boolean"` → `boolean`
  - `"integer"` / `"number"` → `number`
  - `"string"` → `string` (default fallback)
  - `"object"` → `object`
  - `"array"` → `string` for now (rendered as text; framework lets us swap later)
- Preserves `jsonType` and any unknown hint fields on the normalized object (passed through into `SettingSchema` as optional fields) so future editors can read them.
- Promotes existing hints we already know about: if the raw setting has an `enum`/`enumValues` array, set `type: "enum"` and populate `enumValues` (this gives us a forward path to "dropdown lists with available options").

### 2. Extend `SettingSchema`

In `types-v2.ts`:

- Add `jsonType?: string` and an open-ended `ui?: Record<string, unknown>` (or named optional hint fields like `enumValues`, `format`, `multiline`) to `SettingSchema`. The shape stays backward compatible.

### 3. Introduce an editor registry

New file `src/components/runtime-builder/settings/editors.tsx` exporting:

```ts
type EditorProps = {
  id: string;
  setting: SettingSchema;
  value: unknown;
  onChange: (v: unknown) => void;
};
type SettingEditor = {
  match: (s: SettingSchema) => boolean;   // priority via array order
  render: (p: EditorProps) => JSX.Element;
  layout?: "inline" | "stacked";          // lets the wrapper choose label placement
};
const editors: SettingEditor[] = [ booleanEditor, enumEditor, numberEditor, secretEditor, stringEditor ];
export function resolveEditor(s: SettingSchema): SettingEditor { ... }
```

- `booleanEditor` renders a `Checkbox` + label-on-the-right, layout `"inline"` (label suppressed by the wrapper).
- `enumEditor` renders the existing `Select`.
- `numberEditor` renders the numeric `Input`.
- `secretEditor` (`setting.secret === true`) renders the password input + reveal button.
- `stringEditor` is the fallback.

Adding new editors later (e.g., async-loaded dropdown driven by a `ui.options` hint) is a single push into the array.

### 4. Refactor `SchemaField.tsx`

- Keep the outer wrapper (label row, secret/advanced badges, description, env hint).
- Call `resolveEditor(setting)`; render its component.
- When the editor's `layout === "inline"` (boolean), render label + checkbox inline (label to the right of the checkbox), skip the top label row. Otherwise keep current stacked layout.

### 5. Adjust `StepConfigure.tsx`

- Remove the `setting.type === "boolean"` styling hack since the inline layout now lives in the editor wrapper. Keep the 2-col grid.

### 6. Verify

- Hard-refresh the catalog page (60s edge cache may need to expire) and confirm:
  - Boolean settings render as a checkbox with the setting name as label.
  - Existing number/string/secret/enum settings still work.
  - No layout regressions in `StepConfigure`.

## Technical details

- **Files touched**
  - `src/lib/runtime-builder/types-v2.ts` — extend `SettingSchema`.
  - `src/lib/runtime-builder/catalog-client.ts` — add `normalizeSetting`, call it from `normalizeFeature`.
  - `src/components/runtime-builder/settings/editors.tsx` — **new**, editor registry.
  - `src/components/runtime-builder/SchemaField.tsx` — delegate to registry, handle inline layout.
  - `src/components/runtime-builder/StepConfigure.tsx` — drop boolean-only flex class.
- **Backward compatibility**: settings that already have a (legacy) `type` field keep working — `normalizeSetting` only fills in `type` when missing, derived from `jsonType`.
- **Extensibility**: the registry is order-based and matches on the full `SettingSchema`. Future UI hints (e.g., `ui.widget: "async-select"`, `ui.optionsEndpoint: "/x"`, `ui.format: "duration"`) plug in as new editors without touching existing ones.

## Out of scope

- No new UI hint field is wired up yet beyond what the API currently returns. The plumbing is added; concrete editors for new hints land when those hints ship.
- No changes to validation, store, or generation logic.
