
-- 1. Drop raw invitation token column
ALTER TABLE public.invitations DROP COLUMN IF EXISTS token;

-- 2. New RPC: accept invitation by id (verifies email matches caller)
CREATE OR REPLACE FUNCTION public.accept_invitation_by_id(p_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
  _invitation RECORD;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to accept invitation';
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;

  SELECT * INTO _invitation
  FROM invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF LOWER(_invitation.email) != LOWER(_user_email) THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = _invitation.organization_id
      AND user_id = _user_id
  ) THEN
    UPDATE invitations SET status = 'accepted' WHERE id = _invitation.id;
    RETURN _invitation.organization_id;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (_invitation.organization_id, _user_id, _invitation.role);

  UPDATE invitations SET status = 'accepted' WHERE id = _invitation.id;
  RETURN _invitation.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_id(uuid) TO authenticated;

-- 3. Restrict assistant message inserts on weaver_messages to service role only
DROP POLICY IF EXISTS "Users insert assistant messages in own threads" ON public.weaver_messages;
