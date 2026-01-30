-- Add RLS policy allowing provider admins to view ALL their bundles (including inactive)
CREATE POLICY "Provider admins can view all bundles"
  ON credit_bundles FOR SELECT
  USING (is_provider_admin(service_provider_id));