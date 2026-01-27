-- Fix: Change invitations_secure view to use SECURITY INVOKER (default, safer)
-- Drop the SECURITY DEFINER view and recreate properly

DROP VIEW IF EXISTS public.invitations_secure;

-- Recreate the view with security_invoker=on (safer pattern)
CREATE VIEW public.invitations_secure
WITH (security_invoker=on) AS
SELECT 
  id,
  organization_id,
  -- Only show full email to the admin who created the invitation
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