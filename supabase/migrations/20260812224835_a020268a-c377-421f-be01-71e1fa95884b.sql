ALTER TABLE public.products ADD COLUMN IF NOT EXISTS internal_only boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = off) AS
SELECT id,
  service_provider_id,
  name,
  slug,
  tier,
  description,
  price_cents,
  currency,
  recurring_interval,
  triage_response_business_days,
  includes_backports,
  slot_limit,
  stripe_price_id IS NOT NULL AS is_purchasable
FROM public.products
WHERE is_active = true
  AND internal_only = false;

INSERT INTO public.products (
  service_provider_id, kind, name, slug, tier, description,
  price_cents, currency, recurring_interval, stripe_price_id,
  is_active, internal_only, includes_backports
)
SELECT sp.id, 'runtime_subscription'::product_kind,
  'Webhook smoke test (internal)', 'internal-webhook-smoke-test', 'internal',
  'Internal, not for sale. Used to smoke-test the Stripe subscription webhook path.',
  100, 'eur', 'year', NULL, true, true, false
FROM public.service_providers sp
WHERE sp.slug = 'valence-works'
ON CONFLICT DO NOTHING;