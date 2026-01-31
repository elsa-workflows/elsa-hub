-- Fix: Drop and recreate view with SECURITY INVOKER to use caller's permissions
DROP VIEW IF EXISTS credit_bundles_public;

CREATE VIEW credit_bundles_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  description,
  hours,
  price_cents,
  currency,
  billing_type,
  recurring_interval,
  monthly_hours,
  priority_level
FROM credit_bundles
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON credit_bundles_public TO anon;
GRANT SELECT ON credit_bundles_public TO authenticated;