# Academy import

Loads Curriculum's lesson plan into `academy_courses`, `academy_lessons` and `academy_assets`, and uploads kit zips to the private `academy-kits` bucket. Run it locally with a service role. Do not commit secrets. Do not `supabase db push`.

Code: `scripts/academy-import.ts` and `scripts/academy-import-lib.ts`. Config: `academy/lesson-plan.json` (manifest), `academy/manifest.schema.json`, `academy/product-mapping.json`.

## Safety defaults

- Dry-run is the default. Every database or storage write needs `--apply`, including `--price-switch`.
- `npm run academy:import` and `npm run academy:price-switch` do not pass `--apply`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read only under `--apply` or `--compare-live` (a read-only look at the catalog). A plain dry-run never reads them.
- The importer never deletes rows or objects.
- Catalog courses stay unpublished unless you pass `--publish` with `--apply`. Publish is the last step, after courses, lessons and assets succeed. Team sku-rows (`team-5`, `team-10`) are never published by it.
- Existing rows keep their `price_cents`, `currency` and `stripe_price_id`. A rerun after the 1 Nov price switch therefore cannot revert Solo to the launch price. A new row inherits the prices of existing rows with the same `product_code` (so a Solo course added after the switch comes in at the switched price); if those rows disagree the import is refused. Only when no such row exists does a new row get the launch price from `academy/product-mapping.json`.
- `--set-prices` overwrites price fields on existing rows and reads the live catalog, so it needs `--apply` or `--compare-live`. `--set-prices=team_5,team_10` moves only rows of those product codes. Bare `--set-prices` moves every existing row except a `solo_bundle` row already at the post-launch price (3900); to move Solo on purpose, name it: `--set-prices=solo_bundle`.

## Dry-run

```sh
npm run academy:import -- \
  --manifest academy/lesson-plan.json \
  --source-root /path/to/sources \
  --source-commit <elsa-plus-training sha> \
  --assets-dir /path/to/zips
```

Add `--compare-live` (with the Supabase env vars set) to compare against the live catalog. The plan then shows old -> new for price fields and warns about lessons and assets that are in the database for a planned course but not in the plan.

`--source-root` is required and is never read from the JSON. It may be:

- a box checkout whose paths match `source_md` in the lesson plan (rewrites plus leading H1 strip), or
- a `valence-works/elsa-plus-training` checkout that contains `content/courses/<slug>/course.json` and `NN-<lesson>.md`

Lesson `source_md` / `body_md_file` and asset `file` / `source` paths must stay inside `--source-root` or `--assets-dir`. Absolute paths and `..` are refused. A `course.json` that overrides the manifest title, summary or assets is reported as a warning. Its lessons get the same checks as the manifest's (duplicate slugs, slug length, `sort_order`, a preview lesson).

`--source-commit` is recorded in the dry-run summary so a production import can pin the git revision. Product codes, launch prices and the `product_codes` allow-list live in `academy/product-mapping.json`. Extra per-course files (relative path inside `--source-root` or `--assets-dir`, with `label`, `file`, `sha256`, `size_bytes`) go in `courses[].extra_assets`.

## Apply

Run after merge, with Elsa Control Lead told first.

```sh
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export STRIPE_PRICE_ID_SOLO_BUNDLE=price_...
export STRIPE_PRICE_ID_TEAM_5=price_...
export STRIPE_PRICE_ID_TEAM_10=price_...
npm run academy:import -- \
  --manifest academy/lesson-plan.json \
  --source-root /home/box/curriculum \
  --source-commit <sha> \
  --assets-dir /path/to/zips \
  --apply
# add --publish only when the catalog should go live after this run succeeds
# add --set-prices=<codes> (with --apply) only to deliberately overwrite prices on existing rows
```

A `STRIPE_PRICE_ID_*` variable is needed only for a row that is being written with prices: new rows with no sibling row to inherit from, or any row named by `--set-prices`. Each must match `^price_[A-Za-z0-9_]+$`.

Uploads take their content type from the file extension (`zip`, `pdf`, `txt`, `md`, `json`, `png`, `jpg`, `jpeg`; anything else is `application/octet-stream`).

## 1 Nov Solo Bundle price switch

Moves every `solo_bundle` row to 3900 cents and a new Stripe price id (`^price_[A-Za-z0-9_]+$`; surrounding whitespace is trimmed). Dry-run by default.

```sh
npm run academy:price-switch -- --stripe-price-id price_...           # dry-run
npm run academy:price-switch -- --stripe-price-id price_... --apply   # writes
# or: psql "$DATABASE_URL" -v stripe_price_id=price_... -f scripts/academy-price-switch.sql
```

The SQL script sets `ON_ERROR_STOP` itself, so a refused id exits non-zero. It is idempotent: a second run updates zero rows. Because existing rows keep their prices on a normal import, run the switch once and later imports leave it in place.
