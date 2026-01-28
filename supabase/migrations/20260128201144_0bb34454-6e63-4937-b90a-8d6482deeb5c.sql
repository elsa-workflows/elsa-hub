-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON invitations;

CREATE POLICY "Users can view invitations sent to them" 
ON invitations 
FOR SELECT 
TO authenticated
USING (
  lower(email) = lower((auth.jwt() ->> 'email'::text))
  AND status = 'pending'
  AND expires_at > now()
);