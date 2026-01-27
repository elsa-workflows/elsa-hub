-- Create invitations table for pending email invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email, status)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create index for token lookups
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_org_status ON public.invitations(organization_id, status);

-- RLS Policies

-- Org admins can view invitations for their organization
CREATE POLICY "Org admins can view invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (is_org_admin(organization_id));

-- Org admins can create invitations
CREATE POLICY "Org admins can create invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (is_org_admin(organization_id));

-- Org admins can update invitations (revoke)
CREATE POLICY "Org admins can update invitations"
ON public.invitations FOR UPDATE
TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

-- Allow anyone to read their own pending invitation by token (for acceptance flow)
-- This uses a security definer function to avoid exposing all invitations
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  email TEXT,
  role public.org_role,
  expires_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
$$;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
  _invitation RECORD;
  _org_id UUID;
BEGIN
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to accept invitation';
  END IF;
  
  -- Get user email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Find and lock the invitation
  SELECT * INTO _invitation
  FROM invitations
  WHERE token = p_token
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;