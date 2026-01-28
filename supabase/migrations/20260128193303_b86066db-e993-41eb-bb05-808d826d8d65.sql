-- Add RLS policy for users to view invitations sent to their email
CREATE POLICY "Users can view invitations sent to them"
ON public.invitations FOR SELECT
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
  AND status = 'pending'
  AND expires_at > now()
);

-- Create function to ignore an invitation
CREATE OR REPLACE FUNCTION public.ignore_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_email TEXT;
  _invitation RECORD;
BEGIN
  -- Get current user's email
  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();
  
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  
  -- Find and validate the invitation
  SELECT * INTO _invitation FROM invitations
  WHERE id = p_invitation_id
    AND lower(email) = lower(_user_email)
    AND status = 'pending'
  FOR UPDATE;
  
  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or not yours';
  END IF;
  
  -- Mark as ignored
  UPDATE invitations SET status = 'ignored' WHERE id = p_invitation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ignore_invitation(uuid) TO authenticated;