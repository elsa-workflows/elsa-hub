-- One-step Solo Bundle price switch for 1 Nov.
-- Sets academy_courses.price_cents to 3900 and stripe_price_id to the
-- given test or live Stripe price id, for every row whose primary SKU
-- (product_code) is solo_bundle. Idempotent: a second run with the same
-- id updates zero rows.
--
-- Usage (pass the new Stripe price id, no quotes):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v stripe_price_id=price_... \
--     -f scripts/academy-price-switch.sql
--
-- Do not run against production from this repo's CI. Apply by hand after
-- the 1 Nov routine, with Elsa Control Lead told first.
-- Equivalent Node entry: npx tsx scripts/academy-import.ts --price-switch --stripe-price-id price_...

BEGIN;

UPDATE public.academy_courses
SET
  price_cents = 3900,
  stripe_price_id = :'stripe_price_id'
WHERE product_code = 'solo_bundle'
  AND (
    price_cents IS DISTINCT FROM 3900
    OR stripe_price_id IS DISTINCT FROM :'stripe_price_id'
  );

COMMIT;
