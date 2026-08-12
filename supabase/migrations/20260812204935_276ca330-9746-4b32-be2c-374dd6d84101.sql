-- Seed Valence Runtime product tiers.
-- All rows are inserted with is_active = false deliberately:
-- 1. The stripe_price_id values below are test-mode prices. They do not exist in live mode,
--    so activating these before live prices are created would produce a checkout that fails
--    against a price that isn't there. They must be swapped for live IDs first.
-- 2. Subscriptions are not open yet — the public page says so, and these rows must not change that.

WITH provider AS (
  SELECT id FROM public.service_providers WHERE slug = 'valence-works'
)
INSERT INTO public.products (
  service_provider_id, kind, name, slug, tier, description,
  price_cents, currency, recurring_interval, stripe_price_id, is_active,
  triage_response_business_days, includes_backports, slot_limit,
  created_at, updated_at
)
SELECT
  provider.id,
  'runtime_subscription',
  'Valence Runtime',
  'valence-runtime',
  'runtime',
  'Hardened, signed container images with a committed security-patch cadence, immutable version tags, and bug reports triaged within 5 business days.',
  150000,
  'eur',
  'year',
  'price_1U3j4MR44lqjU5yVDrp7Kw5p',
  false,
  5,
  false,
  null,
  now(),
  now()
FROM provider
ON CONFLICT (service_provider_id, slug) DO NOTHING;

WITH provider AS (
  SELECT id FROM public.service_providers WHERE slug = 'valence-works'
)
INSERT INTO public.products (
  service_provider_id, kind, name, slug, tier, description,
  price_cents, currency, recurring_interval, stripe_price_id, is_active,
  triage_response_business_days, includes_backports, slot_limit,
  created_at, updated_at
)
SELECT
  provider.id,
  'runtime_subscription',
  'Valence Runtime Priority',
  'valence-runtime-priority',
  'runtime_priority',
  'Everything in Valence Runtime, with 2-business-day triage, higher queue priority, advance notice of security fixes, and backports to your pinned minor version.',
  450000,
  'eur',
  'year',
  'price_1U3j4NR44lqjU5yVzshlklZA',
  false,
  2,
  true,
  null,
  now(),
  now()
FROM provider
ON CONFLICT (service_provider_id, slug) DO NOTHING;

WITH provider AS (
  SELECT id FROM public.service_providers WHERE slug = 'valence-works'
)
INSERT INTO public.products (
  service_provider_id, kind, name, slug, tier, description,
  price_cents, currency, recurring_interval, stripe_price_id, is_active,
  triage_response_business_days, includes_backports, slot_limit,
  created_at, updated_at
)
SELECT
  provider.id,
  'runtime_subscription',
  'Maintainer Access',
  'valence-runtime-maintainer-access',
  'maintainer_access',
  'Everything in Runtime Priority, with 1-business-day triage, top queue priority, a direct channel to the maintainer, and a quarterly check-in call. Limited to three subscribers.',
  2500000,
  'eur',
  'year',
  null,
  false,
  1,
  true,
  3,
  now(),
  now()
FROM provider
ON CONFLICT (service_provider_id, slug) DO NOTHING;