-- Create public view for credit bundles (excludes sensitive data)
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