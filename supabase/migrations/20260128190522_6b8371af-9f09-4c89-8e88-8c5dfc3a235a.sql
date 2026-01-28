-- Step 1: Add billing_type enum (may already exist, use IF NOT EXISTS pattern)
DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('one_time', 'recurring');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add subscription_credit to ledger_reason_code enum if not exists
DO $$ BEGIN
  ALTER TYPE ledger_reason_code ADD VALUE 'subscription_credit';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Modify credit_bundles table to support recurring billing (if columns don't exist)
ALTER TABLE credit_bundles 
  ADD COLUMN IF NOT EXISTS billing_type billing_type NOT NULL DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS recurring_interval TEXT,
  ADD COLUMN IF NOT EXISTS monthly_hours INTEGER;

-- Step 4: Drop the existing hours check constraint and add new one
ALTER TABLE credit_bundles DROP CONSTRAINT IF EXISTS credit_bundles_hours_check;
ALTER TABLE credit_bundles 
  ADD CONSTRAINT credit_bundles_hours_check 
  CHECK (
    (billing_type = 'one_time' AND hours > 0) OR 
    (billing_type = 'recurring')
  );

-- Step 5: Add constraint to ensure recurring bundles have monthly_hours (if not exists)
ALTER TABLE credit_bundles DROP CONSTRAINT IF EXISTS check_recurring_has_monthly_hours;
ALTER TABLE credit_bundles 
  ADD CONSTRAINT check_recurring_has_monthly_hours 
  CHECK (billing_type = 'one_time' OR monthly_hours IS NOT NULL);

-- Step 6: Create subscriptions table if not exists
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_provider_id UUID NOT NULL REFERENCES service_providers(id),
  credit_bundle_id UUID NOT NULL REFERENCES credit_bundles(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 7: Add subscription reference to credit_lots (if not exists)
ALTER TABLE credit_lots 
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id),
  ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ;

-- Step 8: Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 9: RLS policies for subscriptions (drop and recreate to be idempotent)
DROP POLICY IF EXISTS "Org members can view their subscriptions" ON subscriptions;
CREATE POLICY "Org members can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "Provider members can view customer subscriptions" ON subscriptions;
CREATE POLICY "Provider members can view customer subscriptions"
  ON subscriptions FOR SELECT
  USING (is_provider_member(service_provider_id));

-- Step 10: Add updated_at trigger for subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_credit_lots_subscription_id ON credit_lots(subscription_id);

-- Step 12: Insert Ongoing Advisory bundle with the Stripe price ID
INSERT INTO credit_bundles (
  service_provider_id, 
  name, 
  description, 
  billing_type, 
  recurring_interval, 
  monthly_hours, 
  hours,
  price_cents, 
  currency, 
  stripe_price_id, 
  is_active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Ongoing Advisory',
  '6 hours per month, priority scheduling, and async Q&A access',
  'recurring',
  'month',
  6,
  0,
  200000,
  'eur',
  'price_1Sue2iR90AfIREKG7Ra1D17c',
  true
);