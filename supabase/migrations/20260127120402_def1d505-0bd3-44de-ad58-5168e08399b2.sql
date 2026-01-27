-- Security fix: Hash invitation tokens and restrict email visibility
-- This migration addresses the "invitations_email_exposure" security finding

-- Step 1: Add token_hash column for secure token storage
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Step 2: Create a function to hash tokens using SHA-256
CREATE OR REPLACE FUNCTION public.hash_invitation_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(sha256(p_token::bytea), 'hex');
$$;

-- Step 3: Hash existing tokens (one-time migration)
UPDATE public.invitations 
SET token_hash = public.hash_invitation_token(token)
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Step 4: Update get_invitation_by_token to use hash comparison
-- This prevents token exposure in database queries
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  id uuid, 
  organization_id uuid, 
  organization_name text, 
  organization_slug text, 
  email text, 
  role org_role, 
  expires_at timestamp with time zone, 
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    i.email,
    i.role,
    i.expires_at,
    i.status
  FROM invitations i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token_hash = public.hash_invitation_token(p_token)
    AND i.status = 'pending'
    AND i.expires_at > NOW();
$$;

-- Step 5: Update accept_invitation to use hash comparison
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
  _invitation RECORD;
  _token_hash TEXT;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to accept invitation';
  END IF;
  
  -- Get user email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Compute token hash
  _token_hash := public.hash_invitation_token(p_token);
  
  -- Find and lock the invitation using hash
  SELECT * INTO _invitation
  FROM invitations
  WHERE token_hash = _token_hash
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;
  
  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Verify email matches (case-insensitive)
  IF LOWER(_invitation.email) != LOWER(_user_email) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = _invitation.organization_id
      AND user_id = _user_id
  ) THEN
    -- Update invitation status and return org id
    UPDATE invitations SET status = 'accepted' WHERE id = _invitation.id;
    RETURN _invitation.organization_id;
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (_invitation.organization_id, _user_id, _invitation.role);
  
  -- Mark invitation as accepted
  UPDATE invitations SET status = 'accepted' WHERE id = _invitation.id;
  
  RETURN _invitation.organization_id;
END;
$$;

-- Step 6: Create a secure view for invitation listing
-- Only shows emails to the admin who created the invitation
CREATE OR REPLACE VIEW public.invitations_secure AS
SELECT 
  id,
  organization_id,
  -- Only show email to the admin who created the invitation
  CASE 
    WHEN invited_by = auth.uid() THEN email 
    ELSE '***@' || split_part(email, '@', 2)  -- Mask email, show only domain
  END as email,
  role,
  expires_at,
  status,
  created_at,
  invited_by
FROM public.invitations;

-- Step 7: Update RLS policies to be more restrictive
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Org admins can view invitations" ON public.invitations;

-- Create new policy that restricts direct table access
-- Admins can only see invitations they created, or use the secure view
CREATE POLICY "Org admins can view own invitations" 
ON public.invitations 
FOR SELECT 
USING (
  is_org_admin(organization_id) AND invited_by = auth.uid()
);

-- Step 8: Remove plaintext token column (keep for now as backup, remove in future migration)
-- For now, we'll just ensure it's not exposed
-- We'll set tokens to NULL after hashing to prevent exposure
UPDATE public.invitations 
SET token = NULL 
WHERE token_hash IS NOT NULL AND token IS NOT NULL;

-- Add NOT NULL constraint to token_hash for new records
-- (can't add constraint while existing NULLs exist, so we skip this for now)