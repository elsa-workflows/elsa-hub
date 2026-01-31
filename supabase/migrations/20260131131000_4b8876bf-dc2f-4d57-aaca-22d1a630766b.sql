-- Phase 1 Critical Security Fixes

-- 1. Enable RLS on intro_call_requests (policies already exist but RLS was disabled)
ALTER TABLE intro_call_requests ENABLE ROW LEVEL SECURITY;

-- 2. Fix profiles table - replace overly permissive policy with scoped visibility
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Users can view profiles in their scope"
ON profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_members pm1
    JOIN provider_members pm2 ON pm1.service_provider_id = pm2.service_provider_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_customers pc
    JOIN organization_members om ON om.organization_id = pc.organization_id
    JOIN provider_members pm ON pm.service_provider_id = pc.service_provider_id
    WHERE (om.user_id = profiles.user_id AND pm.user_id = auth.uid())
       OR (pm.user_id = profiles.user_id AND om.user_id = auth.uid())
  )
);