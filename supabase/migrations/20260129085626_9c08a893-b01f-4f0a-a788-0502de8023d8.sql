-- Create subscription record for existing Stripe subscription
INSERT INTO subscriptions (
  organization_id,
  service_provider_id,
  credit_bundle_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
) VALUES (
  'b22b8945-3364-45fb-a41c-19894dce4a07',  -- Customer org
  '11111111-1111-1111-1111-111111111111',  -- Skywalker Digital
  (SELECT id FROM credit_bundles WHERE stripe_price_id = 'price_1Sue2iR90AfIREKG7Ra1D17c'),
  'sub_1Sup6PR90AfIREKGp0yztMms',
  'cus_TsaGSjYHzlJv3a',
  'active',
  '2026-01-29T06:53:14Z',
  '2026-02-28T06:53:14Z',
  false
);

-- Upsert provider_customers relationship
INSERT INTO provider_customers (organization_id, service_provider_id)
VALUES ('b22b8945-3364-45fb-a41c-19894dce4a07', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (organization_id, service_provider_id) DO NOTHING;

-- Create credit lot for the first billing period (6 hours = 360 minutes for Ongoing Advisory)
INSERT INTO credit_lots (
  organization_id,
  service_provider_id,
  subscription_id,
  billing_period_start,
  minutes_purchased,
  minutes_remaining,
  expires_at,
  status
) 
SELECT 
  'b22b8945-3364-45fb-a41c-19894dce4a07',
  '11111111-1111-1111-1111-111111111111',
  s.id,
  '2026-01-29T06:53:14Z',
  360,  -- 6 hours * 60 minutes
  360,
  NOW() + INTERVAL '24 months',
  'active'
FROM subscriptions s 
WHERE s.stripe_subscription_id = 'sub_1Sup6PR90AfIREKGp0yztMms';

-- Create ledger entry for the credits
INSERT INTO credit_ledger_entries (
  organization_id,
  service_provider_id,
  entry_type,
  minutes_delta,
  reason_code,
  related_credit_lot_id,
  actor_type,
  notes
)
SELECT 
  'b22b8945-3364-45fb-a41c-19894dce4a07',
  '11111111-1111-1111-1111-111111111111',
  'credit',
  360,
  'subscription_credit',
  cl.id,
  'system',
  'Ongoing Advisory subscription: 6 hours for period starting 2026-01-29'
FROM credit_lots cl
JOIN subscriptions s ON s.id = cl.subscription_id
WHERE s.stripe_subscription_id = 'sub_1Sup6PR90AfIREKGp0yztMms';

-- Create audit event
INSERT INTO audit_events (
  organization_id,
  service_provider_id,
  actor_type,
  entity_type,
  entity_id,
  action,
  after_json
)
SELECT
  'b22b8945-3364-45fb-a41c-19894dce4a07',
  '11111111-1111-1111-1111-111111111111',
  'system',
  'subscription',
  s.id,
  'created',
  jsonb_build_object(
    'bundle_name', 'Ongoing Advisory',
    'monthly_hours', 6,
    'status', 'active',
    'note', 'Manual recovery after webhook fix'
  )
FROM subscriptions s
WHERE s.stripe_subscription_id = 'sub_1Sup6PR90AfIREKGp0yztMms';