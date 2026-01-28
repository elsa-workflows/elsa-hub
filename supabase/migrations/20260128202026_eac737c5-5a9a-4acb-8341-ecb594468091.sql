-- Allow users who have pending invitations to view the organization they're invited to
-- This is necessary so the invitation query can join with organizations
CREATE POLICY "Invitees can view organizations they are invited to" 
ON organizations 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.organization_id = organizations.id
      AND lower(invitations.email) = lower((auth.jwt() ->> 'email'::text))
      AND invitations.status = 'pending'
      AND invitations.expires_at > now()
  )
);