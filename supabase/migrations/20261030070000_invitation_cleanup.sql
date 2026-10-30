-- Invitation and membership retention.
--
-- 1. invitations.status_changed_at records when an invitation stopped being
--    pending (cancelled/revoked by an admin, ignored/declined by the invitee,
--    accepted, or marked expired). A trigger keeps it current.
-- 2. public.purge_stale_invitations() hard-deletes invitations that ended
--    more than 30 days ago:
--      * pending invitations whose expires_at is more than 30 days past;
--      * expired, revoked, cancelled and ignored invitations whose end time
--        (the earlier of expires_at and status_changed_at) is more than
--        30 days past.
--    Accepted invitations are kept; they are not covered by the retention
--    promise and go when the organisation or inviter is deleted (FK cascade).
-- 3. A daily pg_cron job, purge-stale-invitations-daily, runs the purge.
-- 4. Members may delete their own non-owner membership row, so "Leave
--    organization" hard-deletes the row for plain members too. Before this,
--    only org admins matched a DELETE policy, so a plain member's leave was
--    a silent no-op under RLS.
--
-- pg_cron 1.6.4 is already installed on the hosted project. This migration
-- does not create or read any vault secret and does not touch other cron jobs.

-- ---------------------------------------------------------------------------
-- 1. status_changed_at
-- ---------------------------------------------------------------------------

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone;

COMMENT ON COLUMN public.invitations.status_changed_at IS
  'When status last changed away from pending. Used by purge_stale_invitations().';

-- Existing ended invitations have no recorded end time. created_at is never
-- later than the real end time, so purging from it never keeps a row longer
-- than 30 days after it ended.
UPDATE public.invitations
SET status_changed_at = created_at
WHERE status <> 'pending'
  AND status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_invitation_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' AND NEW.status_changed_at IS NULL THEN
      NEW.status_changed_at := now();
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_invitation_status_changed_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_invitation_status_changed_at() FROM anon, authenticated;

DROP TRIGGER IF EXISTS set_invitation_status_changed_at ON public.invitations;
CREATE TRIGGER set_invitation_status_changed_at
BEFORE INSERT OR UPDATE OF status ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_status_changed_at();

-- ---------------------------------------------------------------------------
-- 2. Purge function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_stale_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.invitations i
  WHERE (
      i.status = 'pending'
      AND i.expires_at < now() - interval '30 days'
    )
    OR (
      i.status IN ('expired', 'revoked', 'cancelled', 'ignored')
      AND LEAST(i.expires_at, COALESCE(i.status_changed_at, i.created_at))
          < now() - interval '30 days'
    );

  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_stale_invitations() IS
  'Deletes invitations that expired, were revoked/cancelled or were ignored (declined) more than 30 days ago. Run daily by pg_cron job purge-stale-invitations-daily.';

REVOKE ALL ON FUNCTION public.purge_stale_invitations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_stale_invitations() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_invitations() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Daily schedule (04:30 UTC)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-stale-invitations-daily') THEN
    PERFORM cron.unschedule('purge-stale-invitations-daily');
  END IF;
END
$$;

SELECT cron.schedule(
  'purge-stale-invitations-daily',
  '30 4 * * *',
  $cron$ SELECT public.purge_stale_invitations(); $cron$
);

-- ---------------------------------------------------------------------------
-- 4. Members can leave (hard delete of their own membership row)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can leave organizations" ON public.organization_members;
CREATE POLICY "Members can leave organizations"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND role <> 'owner'
);
