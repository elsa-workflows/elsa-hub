# Academy import

Loads Curriculum's lesson plan into `academy_courses`, `academy_lessons` and `academy_assets`, and uploads kit zips to the private `academy-kits` bucket. Run it locally with a service role. Do not commit secrets. Do not `supabase db push`.

Code: `scripts/academy-import.ts` and `scripts/academy-import-lib.ts`. Config: `academy/lesson-plan.json` (manifest), `academy/manifest.schema.json`, `academy/product-mapping.json`.

## Safety defaults

- Dry-run is the default. Every database or storage write needs `--apply`, including `--price-switch`.
- `npm run academy:import` and `npm run academy:price-switch` do not pass `--apply`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read only under `--apply` or `--compare-live` (a read-only look at the catalog). A plain dry-run never reads them.
- The importer never deletes rows or objects.
- Catalog courses stay unpublished unless you pass `--publish` with `--apply`. Publish is the last step, after courses, lessons and assets succeed. Team sku-rows (`team-5`, `team-10`) are never published by it.
- Existing rows never change price through the importer (`price_cents`, `currency` and `stripe_price_id` are never written to a row that exists). New rows inherit their product's live price. To change a product's price everywhere, use `--price-switch`.
- A new row copies its prices from the rows of the live catalog (all of them, not only the manifest's) that share its `product_code`. It is refused if those rows disagree or hold a price that could not be sold (Stripe id missing or not `price_...`, `price_cents` not above zero, currency not three lowercase letters). These checks run whenever the live catalog was read, under `--apply` and `--compare-live` alike. Only when no row of that product exists anywhere does a new row take the launch price from `academy/product-mapping.json` and the env Stripe id.
- `--apply` always reads the live catalog first, because inheriting needs it.

## Dry-run

```sh
npm run academy:import -- \
  --manifest academy/lesson-plan.json \
  --source-root /path/to/sources \
  --source-commit <elsa-plus-training sha> \
  --assets-dir /path/to/zips
```

A plain dry-run does not read the database, so the prices it shows are the mapping's launch prices for new rows; a real run would inherit the live price instead. Add `--compare-live` (with the Supabase env vars set) to read the live catalog: the plan then shows what each new row would inherit, flags prices that cannot be inherited, and warns about lessons and assets that are in the database for a planned course but not in the plan.

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
```

Under `--apply`, a `STRIPE_PRICE_ID_*` variable is needed only for a new row whose product has no row in the catalog yet (the first import). It must match `^price_[A-Za-z0-9_]+$`. Reruns and added courses of an existing product need none.

Uploads take their content type from the file extension (`zip`, `pdf`, `txt`, `md`, `json`, `png`, `jpg`, `jpeg`; anything else is `application/octet-stream`).

## Price switch (the 1 Nov Solo move, or any product)

The only way the tooling changes a product's price. It moves every `academy_courses` row with a given `product_code`, including rows no manifest lists, to a new `price_cents` and Stripe price id (`^price_[A-Za-z0-9_]+$`; surrounding whitespace is trimmed), in one statement. Dry-run by default, idempotent, and a product code that matches no row is refused.

```sh
# 1 Nov: solo_bundle at the mapping's post-launch price (3900)
npm run academy:price-switch -- --stripe-price-id price_...            # dry-run
npm run academy:price-switch -- --stripe-price-id price_... --apply    # writes
# any other product names its price
npm run academy:price-switch -- --product team_5 --price-cents 39900 --stripe-price-id price_... --apply
```

The SQL equivalent takes the same inputs (defaults `solo_bundle` and 3900 when neither is given):

```sh
psql "$DATABASE_URL" -v stripe_price_id=price_... -f scripts/academy-price-switch.sql
psql "$DATABASE_URL" -v product_code=team_5 -v price_cents=39900 -v stripe_price_id=price_... -f scripts/academy-price-switch.sql
```

The script sets `ON_ERROR_STOP` itself, so a refused value exits non-zero. It guards the product code, the price and the id. Because existing rows never change price through the importer, run the switch once and later imports leave it in place.
