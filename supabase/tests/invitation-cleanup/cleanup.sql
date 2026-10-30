-- Assertions for 20261030070000_invitation_cleanup.sql: status_changed_at
-- backfill and trigger, purge_stale_invitations(), the pg_cron job, and
-- hard-deleted memberships.

CREATE TEMP TABLE inv_cleanup_result (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

CREATE OR REPLACE FUNCTION pg_temp.ok(p_passed boolean, p_name text, p_detail text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO inv_cleanup_result (name, passed, detail)
  VALUES (p_name, COALESCE(p_passed, false), p_detail)
  ON CONFLICT (name) DO UPDATE
  SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.set_jwt(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_user_id::text, ''), false);
  IF p_user_id IS NULL THEN
    PERFORM set_config('request.jwt.claims', '', false);
  ELSE
    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
      false
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.clear_jwt()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', false);
  PERFORM set_config('request.jwt.claims', '', false);
END;
$$;

GRANT ALL ON inv_cleanup_result TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.ok(boolean, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.set_jwt(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.clear_jwt() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION pg_temp.inv_exists(p_id uuid)
RETURNS boolean
LANGUAGE sql
AS $$ SELECT EXISTS (SELECT 1 FROM public.invitations WHERE id = p_id); $$;

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  (SELECT status_changed_at = created_at FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000b0001'),
  'backfill: ended invitation gets status_changed_at = created_at'
);
SELECT pg_temp.ok(
  (SELECT status_changed_at IS NULL FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000b0003'),
  'backfill: pending invitation keeps status_changed_at NULL'
);

-- ---------------------------------------------------------------------------
-- Seed (as the table owner, explicit status_changed_at where given)
-- ---------------------------------------------------------------------------

INSERT INTO public.invitations (id, organization_id, email, invited_by, expires_at, status, created_at, status_changed_at) VALUES
  -- p1: pending, expired 31 days ago -> purge
  ('00000000-0000-4000-8000-0000000c0001', '00000000-0000-4000-8000-00000000a001', 'p1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '31 days', 'pending', now() - interval '38 days', NULL),
  -- p2: pending, expired 29 days ago -> keep
  ('00000000-0000-4000-8000-0000000c0002', '00000000-0000-4000-8000-00000000a001', 'p2@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '29 days', 'pending', now() - interval '36 days', NULL),
  -- p3: pending, not expired -> keep
  ('00000000-0000-4000-8000-0000000c0003', '00000000-0000-4000-8000-00000000a001', 'p3@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() + interval '6 days', 'pending', now() - interval '1 day', NULL),
  -- e1: status expired, expires_at 31 days ago (marked later) -> purge
  ('00000000-0000-4000-8000-0000000c0004', '00000000-0000-4000-8000-00000000a001', 'e1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '31 days', 'expired', now() - interval '38 days', now() - interval '2 days'),
  -- e2: status expired, expires_at 5 days ago -> keep
  ('00000000-0000-4000-8000-0000000c0005', '00000000-0000-4000-8000-00000000a001', 'e2@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '5 days', 'expired', now() - interval '12 days', now() - interval '5 days'),
  -- r1: revoked 31 days ago, would have expired 24 days ago -> purge
  ('00000000-0000-4000-8000-0000000c0006', '00000000-0000-4000-8000-00000000a001', 'r1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '24 days', 'revoked', now() - interval '31 days', now() - interval '31 days'),
  -- c1: cancelled 29 days ago -> keep
  ('00000000-0000-4000-8000-0000000c0007', '00000000-0000-4000-8000-00000000a001', 'c1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '22 days', 'cancelled', now() - interval '29 days', now() - interval '29 days'),
  -- c2: cancelled 31 days ago -> purge
  ('00000000-0000-4000-8000-0000000c0008', '00000000-0000-4000-8000-00000000a001', 'c2@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '26 days', 'cancelled', now() - interval '33 days', now() - interval '31 days'),
  -- i1: ignored (declined) 31 days ago -> purge
  ('00000000-0000-4000-8000-0000000c0009', '00000000-0000-4000-8000-00000000a001', 'i1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '25 days', 'ignored', now() - interval '32 days', now() - interval '31 days'),
  -- i2: ignored yesterday -> keep
  ('00000000-0000-4000-8000-0000000c000a', '00000000-0000-4000-8000-00000000a001', 'i2@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() + interval '5 days', 'ignored', now() - interval '2 days', now() - interval '1 day'),
  -- a1: accepted 90 days ago -> keep (not covered by the purge)
  ('00000000-0000-4000-8000-0000000c000b', '00000000-0000-4000-8000-00000000a001', 'a1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '90 days', 'accepted', now() - interval '97 days', now() - interval '95 days');

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

INSERT INTO public.invitations (id, organization_id, email, invited_by, expires_at, status) VALUES
  ('00000000-0000-4000-8000-0000000d0001', '00000000-0000-4000-8000-00000000a001', 't1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() + interval '7 days', 'pending'),
  ('00000000-0000-4000-8000-0000000d0002', '00000000-0000-4000-8000-00000000a001', 't2@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() + interval '7 days', 'revoked');

SELECT pg_temp.ok(
  (SELECT status_changed_at IS NULL FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000d0001'),
  'trigger: new pending invitation has no status_changed_at'
);
SELECT pg_temp.ok(
  (SELECT status_changed_at IS NOT NULL FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000d0002'),
  'trigger: invitation inserted as revoked gets status_changed_at'
);

-- Admin cancels t1 through RLS, as CancelInvitationDialog does.
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-0000000000a1');
SET ROLE authenticated;
UPDATE public.invitations SET status = 'cancelled' WHERE id = '00000000-0000-4000-8000-0000000d0001';
RESET ROLE;
SELECT pg_temp.clear_jwt();

SELECT pg_temp.ok(
  (SELECT status = 'cancelled' AND status_changed_at >= now() - interval '1 minute'
   FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000d0001'),
  'trigger: cancelling an invitation stamps status_changed_at'
);

UPDATE public.invitations SET status_changed_at = now() - interval '3 days'
WHERE id = '00000000-0000-4000-8000-0000000d0001';
UPDATE public.invitations SET role = 'admin' WHERE id = '00000000-0000-4000-8000-0000000d0001';
SELECT pg_temp.ok(
  (SELECT status_changed_at < now() - interval '2 days'
   FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000d0001'),
  'trigger: changing another column leaves status_changed_at alone'
);

-- ignore_invitation sets status = 'ignored'; same trigger path.
UPDATE public.invitations SET status = 'ignored' WHERE id = '00000000-0000-4000-8000-0000000c0003';
SELECT pg_temp.ok(
  (SELECT status_changed_at >= now() - interval '1 minute'
   FROM public.invitations WHERE id = '00000000-0000-4000-8000-0000000c0003'),
  'trigger: declining (ignored) stamps status_changed_at'
);

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.purge_stale_invitations()'::regprocedure),
  'purge: function is SECURITY DEFINER'
);
SELECT pg_temp.ok(
  NOT has_function_privilege('anon', 'public.purge_stale_invitations()', 'EXECUTE'),
  'purge: anon cannot execute'
);
SELECT pg_temp.ok(
  NOT has_function_privilege('authenticated', 'public.purge_stale_invitations()', 'EXECUTE'),
  'purge: authenticated cannot execute'
);
SELECT pg_temp.ok(
  has_function_privilege('service_role', 'public.purge_stale_invitations()', 'EXECUTE'),
  'purge: service_role can execute'
);

DO $$
BEGIN
  PERFORM pg_temp.set_jwt('00000000-0000-4000-8000-0000000000a1');
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.purge_stale_invitations();
    PERFORM pg_temp.ok(false, 'purge: authenticated call is refused');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'purge: authenticated call is refused');
  END;
END
$$;
RESET ROLE;
SELECT pg_temp.clear_jwt();

-- ---------------------------------------------------------------------------
-- Purge
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE purge_run (deleted integer);
GRANT ALL ON purge_run TO service_role;
SET ROLE service_role;
INSERT INTO purge_run SELECT public.purge_stale_invitations();
RESET ROLE;

SELECT pg_temp.ok((SELECT deleted FROM purge_run) = 6, 'purge: deletes exactly six rows',
  'deleted=' || (SELECT deleted FROM purge_run));

SELECT pg_temp.ok(NOT pg_temp.inv_exists('00000000-0000-4000-8000-0000000b0001'), 'purge: backfilled cancellation older than 30 days is deleted');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000b0002'), 'purge: backfilled cancellation within 30 days is kept');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000b0003'), 'purge: open pending invitation is kept');
SELECT pg_temp.ok(NOT pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0001'), 'purge: pending invitation expired 31 days ago is deleted');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0002'), 'purge: pending invitation expired 29 days ago is kept');
SELECT pg_temp.ok(NOT pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0004'), 'purge: expired status, expiry 31 days ago, is deleted');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0005'), 'purge: expired status, expiry 5 days ago, is kept');
SELECT pg_temp.ok(NOT pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0006'), 'purge: revoked 31 days ago is deleted');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0007'), 'purge: cancelled 29 days ago is kept');
SELECT pg_temp.ok(NOT pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0008'), 'purge: cancelled 31 days ago is deleted');
SELECT pg_temp.ok(NOT pg_temp.inv_exists('00000000-0000-4000-8000-0000000c0009'), 'purge: declined (ignored) 31 days ago is deleted');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000c000a'), 'purge: declined yesterday is kept');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000c000b'), 'purge: accepted invitation is kept');
SELECT pg_temp.ok(pg_temp.inv_exists('00000000-0000-4000-8000-0000000d0001'), 'purge: just-cancelled invitation is kept');

SET ROLE service_role;
INSERT INTO purge_run SELECT public.purge_stale_invitations();
RESET ROLE;
SELECT pg_temp.ok((SELECT min(deleted) FROM purge_run) = 0, 'purge: second run deletes nothing');

-- ---------------------------------------------------------------------------
-- Cron job
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  (SELECT count(*) FROM cron.job WHERE jobname = 'purge-stale-invitations-daily') = 1,
  'cron: one purge-stale-invitations-daily job after two applies'
);
SELECT pg_temp.ok(
  (SELECT schedule = '30 4 * * *' AND command LIKE '%public.purge_stale_invitations()%'
   FROM cron.job WHERE jobname = 'purge-stale-invitations-daily'),
  'cron: daily at 04:30 UTC, runs purge_stale_invitations()'
);

-- ---------------------------------------------------------------------------
-- Memberships: removal is a hard delete
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_members'
      AND column_name IN ('deleted_at', 'removed_at', 'is_active', 'active', 'status')
  ),
  'members: organization_members has no soft-delete column'
);

CREATE TEMP TABLE member_delete (name text PRIMARY KEY, n integer);
GRANT ALL ON member_delete TO authenticated;

-- A plain member cannot remove someone else.
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-0000000000a2');
SET ROLE authenticated;
WITH d AS (
  DELETE FROM public.organization_members
  WHERE organization_id = '00000000-0000-4000-8000-00000000a001'
    AND user_id = '00000000-0000-4000-8000-0000000000a3'
  RETURNING id
)
INSERT INTO member_delete SELECT 'member removes other', count(*) FROM d;

-- A plain member leaves (LeaveOrganizationDialog: delete ... select('id')).
WITH d AS (
  DELETE FROM public.organization_members
  WHERE organization_id = '00000000-0000-4000-8000-00000000a001'
    AND user_id = '00000000-0000-4000-8000-0000000000a2'
  RETURNING id
)
INSERT INTO member_delete SELECT 'member leaves', count(*) FROM d;
RESET ROLE;

-- An admin removes a member (RemoveMemberDialog).
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-0000000000a1');
SET ROLE authenticated;
WITH d AS (
  DELETE FROM public.organization_members
  WHERE organization_id = '00000000-0000-4000-8000-00000000a001'
    AND user_id = '00000000-0000-4000-8000-0000000000a3'
  RETURNING id
)
INSERT INTO member_delete SELECT 'admin removes member', count(*) FROM d;
RESET ROLE;
SELECT pg_temp.clear_jwt();

SELECT pg_temp.ok((SELECT n FROM member_delete WHERE name = 'member removes other') = 0,
  'members: plain member cannot remove another member');
SELECT pg_temp.ok((SELECT n FROM member_delete WHERE name = 'member leaves') = 1,
  'members: plain member leaving deletes one row and returns it');
SELECT pg_temp.ok(
  NOT EXISTS (SELECT 1 FROM public.organization_members
              WHERE user_id = '00000000-0000-4000-8000-0000000000a2'),
  'members: left membership row is gone'
);
SELECT pg_temp.ok((SELECT n FROM member_delete WHERE name = 'admin removes member') = 1,
  'members: admin removal deletes one row and returns it');
SELECT pg_temp.ok(
  NOT EXISTS (SELECT 1 FROM public.organization_members
              WHERE user_id = '00000000-0000-4000-8000-0000000000a3'),
  'members: removed membership row is gone'
);

-- The leave policy itself excludes owners (owners leave via transfer/delete).
SELECT pg_temp.ok(
  (SELECT qual LIKE '%owner%' FROM pg_policies
   WHERE tablename = 'organization_members' AND policyname = 'Members can leave organizations'
     AND cmd = 'DELETE'),
  'members: leave policy excludes the owner role'
);

-- ---------------------------------------------------------------------------
-- Cleanup and report
-- ---------------------------------------------------------------------------

DELETE FROM public.invitations;
DELETE FROM public.organization_members WHERE organization_id = '00000000-0000-4000-8000-00000000a001';
DELETE FROM public.organizations WHERE id = '00000000-0000-4000-8000-00000000a001';
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a4'
);

\echo
\echo '=== invitation_cleanup results ==='
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  name,
  COALESCE(detail, '') AS detail
FROM inv_cleanup_result
ORDER BY passed ASC, name;

\echo
SELECT
  COUNT(*) FILTER (WHERE passed) AS passed,
  COUNT(*) FILTER (WHERE NOT passed) AS failed,
  COUNT(*) AS total
FROM inv_cleanup_result;

DO $$
DECLARE
  v_failed integer;
BEGIN
  SELECT COUNT(*) INTO v_failed FROM inv_cleanup_result WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION '% invitation_cleanup assertion(s) failed', v_failed;
  END IF;
END
$$;
