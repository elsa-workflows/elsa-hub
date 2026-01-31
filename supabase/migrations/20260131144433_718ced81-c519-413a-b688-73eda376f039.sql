-- Drop the existing view and recreate without security_invoker
-- This allows anonymous users to query the view (which internally reads from credit_bundles as DEFINER)
DROP VIEW IF EXISTS credit_bundles_public;

CREATE VIEW credit_bundles_public AS
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