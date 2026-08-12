CREATE OR REPLACE VIEW public.products_public AS
SELECT
  id,
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
  (stripe_price_id IS NOT NULL) AS is_purchasable
FROM public.products
WHERE is_active = true;

GRANT SELECT ON public.products_public TO anon, authenticated;