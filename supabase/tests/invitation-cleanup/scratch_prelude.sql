-- Extra stubs on top of the academy and cloud-organization-links scratch
-- preludes for the invitation cleanup migration. They copy the production
-- shape of public.invitations and the organization_members RLS policies
-- (checked read-only against the hosted project on 2026-10-30), and stub the
-- parts of pg_cron the migration calls, since stock Postgres has no pg_cron.

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  token_hash text,
  CONSTRAINT invitations_status_check CHECK (status = ANY (ARRAY['pending', 'accepted', 'expired', 'revoked', 'cancelled', 'ignored'])),
  CONSTRAINT invitations_organization_id_email_status_key UNIQUE (organization_id, email, status)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated, service_role;

DROP POLICY IF EXISTS "Org admins can update invitations" ON public.invitations;
CREATE POLICY "Org admins can update invitations"
ON public.invitations FOR UPDATE TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

DROP POLICY IF EXISTS "Org admins can view own invitations" ON public.invitations;
CREATE POLICY "Org admins can view own invitations"
ON public.invitations FOR SELECT TO authenticated
USING (is_org_admin(organization_id) AND invited_by = auth.uid());

-- organization_members as on production: RLS on, admins delete, members read.
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated, service_role;

DROP POLICY IF EXISTS "Org members can view their team" ON public.organization_members;
CREATE POLICY "Org members can view their team"
ON public.organization_members FOR SELECT TO authenticated
USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "Org admins can delete members" ON public.organization_members;
CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE TO authenticated
USING (is_org_admin(organization_id));

-- pg_cron stub: just the cron.job table and schedule/unschedule.
CREATE SCHEMA IF NOT EXISTS cron;

CREATE TABLE IF NOT EXISTS cron.job (
  jobid bigserial PRIMARY KEY,
  jobname text UNIQUE,
  schedule text NOT NULL,
  command text NOT NULL
);

CREATE OR REPLACE FUNCTION cron.schedule(p_jobname text, p_schedule text, p_command text)
RETURNS bigint
LANGUAGE sql
AS $$
  INSERT INTO cron.job (jobname, schedule, command)
  VALUES (p_jobname, p_schedule, p_command)
  ON CONFLICT (jobname) DO UPDATE
  SET schedule = EXCLUDED.schedule, command = EXCLUDED.command
  RETURNING jobid;
$$;

CREATE OR REPLACE FUNCTION cron.unschedule(p_jobname text)
RETURNS boolean
LANGUAGE sql
AS $$
  WITH d AS (DELETE FROM cron.job WHERE jobname = p_jobname RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM d);
$$;
