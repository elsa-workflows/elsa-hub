-- Phase 2 Security Fixes

-- 1. Require authentication for credit_bundles (hide Stripe price IDs from public)
DROP POLICY IF EXISTS "Anyone can view active bundles" ON credit_bundles;

CREATE POLICY "Authenticated users can view active bundles"
ON credit_bundles FOR SELECT TO authenticated
USING (is_active = true);

-- 2. Add explicit policies to unsubscribe_tokens table for clarity
-- This table should only be accessible via service role (edge functions)
ALTER TABLE unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated users
-- Edge functions use service role which bypasses RLS