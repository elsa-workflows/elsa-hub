-- Price switch for one product code, e.g. the 1 Nov Solo Bundle move.
-- Sets academy_courses.price_cents and stripe_price_id on EVERY row whose
-- product_code matches, in one transaction. Idempotent: a second run with the
-- same values updates zero rows. A product code that matches no row is an error.
--
-- Usage (no quotes around the values):
--   Solo, 1 Nov (defaults: product_code solo_bundle, price_cents 3900):
--     psql "$DATABASE_URL" -v stripe_price_id=price_... \
--       -f scripts/academy-price-switch.sql
--   Any other product, price_cents required:
--     psql "$DATABASE_URL" -v product_code=team_5 -v price_cents=34900 \
--       -v stripe_price_id=price_... -f scripts/academy-price-switch.sql
-- A refused value exits non-zero (the script sets ON_ERROR_STOP itself).
--
-- Do not run against production from this repo's CI. Apply by hand after
-- the 1 Nov routine, with Elsa Control Lead told first.
-- Equivalent Node entry:
--   npx tsx scripts/academy-import.ts --price-switch --stripe-price-id price_... \
--     [--product <code> --price-cents <n>] --apply

\set ON_ERROR_STOP on

-- Defaults are the Solo switch only. An explicit product_code without a
-- price_cents leaves price_cents empty, which the guard below refuses.
\if :{?price_cents}
\else
  \if :{?product_code}
    \set price_cents ''
  \else
    \set price_cents 3900
  \endif
\endif
\if :{?product_code}
\else
  \set product_code solo_bundle
\endif

BEGIN;

-- psql does not interpolate :'var' inside dollar-quoted blocks, so hand the
-- values to the guard through transaction-local settings.
SELECT
  set_config('academy.product_code', :'product_code', true),
  set_config('academy.price_cents', :'price_cents', true),
  set_config('academy.stripe_price_id', :'stripe_price_id', true)
\g /dev/null

DO $guard$
DECLARE
  code text := current_setting('academy.product_code');
  cents text := current_setting('academy.price_cents');
  new_id text := current_setting('academy.stripe_price_id');
BEGIN
  IF code !~ '^[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'product_code must match ^[a-z0-9_]+$ (got "%")', code;
  END IF;
  IF cents !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'price_cents must be a positive integer (got "%"); it is required unless product_code is the default solo_bundle', cents;
  END IF;
  IF new_id !~ '^price_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'stripe_price_id must match ^price_[A-Za-z0-9_]+$ (got "%")', new_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.academy_courses WHERE product_code = code) THEN
    RAISE EXCEPTION 'no academy_courses row has product_code "%"; nothing to switch', code;
  END IF;
END
$guard$;

UPDATE public.academy_courses
SET
  price_cents = current_setting('academy.price_cents')::integer,
  stripe_price_id = current_setting('academy.stripe_price_id')
WHERE product_code = current_setting('academy.product_code')
  AND (
    price_cents IS DISTINCT FROM current_setting('academy.price_cents')::integer
    OR stripe_price_id IS DISTINCT FROM current_setting('academy.stripe_price_id')
  );

COMMIT;
