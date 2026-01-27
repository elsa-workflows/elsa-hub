-- Seed default service provider: Skywalker Digital
INSERT INTO public.service_providers (id, name, slug, logo_url)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Skywalker Digital',
  'skywalker-digital',
  NULL
)
ON CONFLICT (slug) DO NOTHING;

-- Seed credit bundles for Skywalker Digital
INSERT INTO public.credit_bundles (service_provider_id, name, description, hours, price_cents, currency, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Starter Pack', '5 hours of expert services - perfect for small projects', 5, 40000, 'usd', true),
  ('11111111-1111-1111-1111-111111111111', 'Growth Pack', '10 hours of expert services - great value for growing teams', 10, 75000, 'usd', true),
  ('11111111-1111-1111-1111-111111111111', 'Scale Pack', '25 hours of expert services - best for ongoing projects', 25, 162500, 'usd', true),
  ('11111111-1111-1111-1111-111111111111', 'Enterprise Pack', '50 hours of expert services - maximum savings for enterprises', 50, 275000, 'usd', true)
ON CONFLICT DO NOTHING;

-- Create idempotency indexes if not exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_lots_order_unique 
ON public.credit_lots (order_id) 
WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_purchase_order_unique 
ON public.credit_ledger_entries (related_order_id) 
WHERE related_order_id IS NOT NULL AND reason_code = 'purchase';

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_order_unique 
ON public.invoices (order_id) 
WHERE order_id IS NOT NULL;