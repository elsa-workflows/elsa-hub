-- RLS, uniqueness and write-lockout assertions for org_stripe_customers and
-- user_stripe_customers. Runs in one transaction that is rolled back, with
-- every helper in pg_temp, so nothing is left behind in public.

BEGIN;

CREATE TEMP TABLE stripe_refs_test_result (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

CREATE OR REPLACE FUNCTION pg_temp.ok(p_passed boolean, p_name text, p_detail text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO stripe_refs_test_result (name, passed, detail)
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
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    false
  );
END;
$$;

-- True when the statement hits a unique constraint.
CREATE OR REPLACE FUNCTION pg_temp.throws_unique(p_sql text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
  RETURN false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN true;
END;
$$;

-- True when the statement raises a check constraint violation.
CREATE OR REPLACE FUNCTION pg_temp.throws_check(p_sql text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
  RETURN false;
EXCEPTION
  WHEN check_violation THEN
    RETURN true;
END;
$$;

-- Deletes an owner row, then records whether the refs it owned are gone. A
-- delete that raises (for example a foreign key violation when ON DELETE
-- CASCADE is missing) is a failed assertion carrying SQLERRM, not an aborted
-- run. The delete and the check are separate statements of a volatile
-- function, so the check sees the delete.
CREATE OR REPLACE FUNCTION pg_temp.assert_cascade(
  p_name text,
  p_delete_sql text,
  p_refs_table text,
  p_owner_column text,
  p_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  before_count bigint;
  deleted bigint;
  remaining bigint;
BEGIN
  -- A cascade test over an owner with no refs would pass whatever the schema
  -- does, so insist on something to cascade and on a delete that took effect.
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = %L', p_refs_table, p_owner_column, p_owner_id)
  INTO before_count;
  IF before_count = 0 THEN
    PERFORM pg_temp.ok(false, p_name, 'no refs to cascade');
    RETURN;
  END IF;

  BEGIN
    EXECUTE p_delete_sql;
    GET DIAGNOSTICS deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_temp.ok(false, p_name, SQLERRM);
      RETURN;
  END;

  IF deleted = 0 THEN
    PERFORM pg_temp.ok(false, p_name, 'the delete removed no rows');
    RETURN;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = %L', p_refs_table, p_owner_column, p_owner_id)
  INTO remaining;
  PERFORM pg_temp.ok(
    remaining = 0,
    p_name,
    CASE WHEN remaining = 0 THEN NULL ELSE remaining || ' ref row(s) remain after the delete' END
  );
END;
$$;

-- True when the statement is refused with insufficient_privilege (42501: no
-- table privilege, or a row-level security policy refusing the new row), or
-- when an UPDATE or DELETE is filtered down to zero rows. Any other error
-- propagates so it cannot pass as a denial.
CREATE OR REPLACE FUNCTION pg_temp.write_denied(p_sql text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  affected integer;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 0;
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN true;
END;
$$;

GRANT ALL ON stripe_refs_test_result TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.ok(boolean, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.set_jwt(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.throws_unique(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.write_denied(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.throws_check(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.assert_cascade(text, text, text, text, uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed. Every fixture user has a distinct email (auth.users.email is unique
-- among non-SSO users), and a plain INSERT so a seeding problem fails loudly.
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-00000000000a', 'org-a-admin@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'org-a-member@example.test'),
  ('00000000-0000-4000-8000-00000000000c', 'org-b-admin@example.test'),
  ('00000000-0000-4000-8000-00000000000d', 'personal@example.test');

INSERT INTO public.organizations (id, name, slug) VALUES
  ('00000000-0000-4000-8000-000000001001', 'Org A', 'org-a-stripe-customer-refs'),
  ('00000000-0000-4000-8000-000000001002', 'Org B', 'org-b-stripe-customer-refs'),
  ('00000000-0000-4000-8000-000000001003', 'Org C', 'org-c-stripe-customer-refs');

-- User a administers Org A and Org C, so a write policy that trusted org
-- admins would let it write for Org C, which has no ref row yet.
INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-00000000000a', 'admin'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-00000000000a', 'admin'),
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-00000000000b', 'member'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-00000000000c', 'admin');

SET LOCAL ROLE service_role;

INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id) VALUES
  ('00000000-0000-4000-8000-000000001001', false, 'cus_test_org_a'),
  ('00000000-0000-4000-8000-000000001002', false, 'cus_test_org_b');

INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id) VALUES
  ('00000000-0000-4000-8000-00000000000d', false, 'cus_test_personal'),
  ('00000000-0000-4000-8000-00000000000a', false, 'cus_test_admin_a_personal');

-- ---------------------------------------------------------------------------
-- Uniqueness (service_role writes)
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  pg_temp.throws_unique($sql$
    INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-000000001001', false, 'cus_test_org_a_dup')
  $sql$),
  'org owner unique rejects a second row for the same livemode'
);

INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
VALUES ('00000000-0000-4000-8000-000000001001', true, 'cus_live_org_a');

SELECT pg_temp.ok(
  (
    SELECT count(*) = 2 FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001001'
  ),
  'same org can store test and live customers'
);

SELECT pg_temp.ok(
  pg_temp.throws_unique($sql$
    INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-000000001003', false, 'cus_test_org_a')
  $sql$),
  'org stripe_customer_id is unique'
);

SELECT pg_temp.ok(
  pg_temp.throws_unique($sql$
    INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-00000000000d', false, 'cus_test_personal_dup')
  $sql$),
  'user owner unique rejects a second row for the same livemode'
);

SELECT pg_temp.ok(
  pg_temp.throws_unique($sql$
    INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-00000000000b', false, 'cus_test_personal')
  $sql$),
  'user stripe_customer_id is unique'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  NOT has_table_privilege('anon', 'public.org_stripe_customers', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.user_stripe_customers', 'SELECT'),
  'anon cannot read either table'
);

SELECT pg_temp.ok(
  NOT (
    has_table_privilege('authenticated', 'public.org_stripe_customers', 'INSERT')
    OR has_table_privilege('authenticated', 'public.org_stripe_customers', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.org_stripe_customers', 'DELETE')
    OR has_table_privilege('authenticated', 'public.user_stripe_customers', 'INSERT')
    OR has_table_privilege('authenticated', 'public.user_stripe_customers', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.user_stripe_customers', 'DELETE')
    OR has_table_privilege('authenticated', 'public.org_stripe_customers', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'public.user_stripe_customers', 'TRUNCATE')
  ),
  'authenticated has no write or truncate privilege on either table'
);

-- TRUNCATE bypasses RLS, and REFERENCES or TRIGGER would be easy to grant by
-- accident, so pin the full ACL: authenticated holds SELECT only, and anon and
-- PUBLIC hold nothing, on both tables.
SELECT pg_temp.ok(
  (
    SELECT bool_and(
      CASE
        WHEN a.grantee = 'authenticated'::regrole THEN a.privilege_type = 'SELECT'
        WHEN a.grantee IN (0, 'anon'::regrole) THEN false
        ELSE true
      END
    )
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    WHERE c.oid IN ('public.org_stripe_customers'::regclass, 'public.user_stripe_customers'::regclass)
  )
  AND (
    SELECT count(*) = 2
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(c.relacl) a
    WHERE c.oid IN ('public.org_stripe_customers'::regclass, 'public.user_stripe_customers'::regclass)
      AND a.grantee = 'authenticated'::regrole
      AND a.privilege_type = 'SELECT'
  ),
  'authenticated holds only SELECT, and anon and PUBLIC hold nothing, on both tables'
);

-- Column-level grants live in pg_attribute.attacl, not pg_class.relacl, so the
-- check above cannot see them (for example REFERENCES (stripe_customer_id) or
-- SELECT (stripe_customer_id) on a single column). System columns such as ctid
-- are included: attnum is not filtered. Dropped columns are excluded: before
-- PostgreSQL 17 a dropped column keeps its attacl, which grants nothing.
SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_attribute att
    CROSS JOIN LATERAL aclexplode(att.attacl) a
    WHERE att.attrelid IN ('public.org_stripe_customers'::regclass, 'public.user_stripe_customers'::regclass)
      AND NOT att.attisdropped
      AND (a.grantee = 0 OR a.grantee IN ('anon'::regrole, 'authenticated'::regrole))
  ),
  'no column-level grant to authenticated, anon or PUBLIC on either table'
);

-- ---------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-00000000000a');
SET LOCAL ROLE authenticated;

SELECT pg_temp.ok(
  (
    SELECT count(*) = 2 FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001001'
  ),
  'org admin can read own org customer refs'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001002'
  ),
  'org admin cannot read another org customer ref'
);

RESET ROLE;
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-00000000000b');
SET LOCAL ROLE authenticated;

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001001'
  ),
  'non-admin member cannot read the org customer ref'
);

RESET ROLE;
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-00000000000d');
SET LOCAL ROLE authenticated;

SELECT pg_temp.ok(
  (
    SELECT count(*) = 1 FROM public.user_stripe_customers
    WHERE user_id = '00000000-0000-4000-8000-00000000000d'
  ),
  'user can read own customer ref'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.user_stripe_customers
    WHERE user_id = '00000000-0000-4000-8000-00000000000a'
  ),
  'user cannot read another user customer ref'
);

-- ---------------------------------------------------------------------------
-- Writes are service_role only. Each statement targets the caller's own row
-- or a mode with no row yet, so a self-write or admin-write policy cannot be
-- hidden behind a unique violation or an empty match.
-- ---------------------------------------------------------------------------

SELECT pg_temp.ok(
  pg_temp.write_denied($sql$
    UPDATE public.user_stripe_customers
    SET stripe_customer_id = 'cus_test_personal_updated'
    WHERE user_id = '00000000-0000-4000-8000-00000000000d' AND livemode = false
  $sql$),
  'user cannot update own customer ref'
);

SELECT pg_temp.ok(
  pg_temp.write_denied($sql$
    DELETE FROM public.user_stripe_customers
    WHERE user_id = '00000000-0000-4000-8000-00000000000d' AND livemode = false
  $sql$),
  'user cannot delete own customer ref'
);

SELECT pg_temp.ok(
  pg_temp.write_denied($sql$
    INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-00000000000d', true, 'cus_live_personal_self')
  $sql$),
  'user cannot insert own customer ref in a mode with no row'
);

RESET ROLE;
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-00000000000a');
SET LOCAL ROLE authenticated;

SELECT pg_temp.ok(
  pg_temp.write_denied($sql$
    INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-000000001003', false, 'cus_test_org_c_admin')
  $sql$),
  'org admin cannot insert a customer ref for an org with no row'
);

SELECT pg_temp.ok(
  pg_temp.write_denied($sql$
    UPDATE public.org_stripe_customers
    SET stripe_customer_id = 'cus_test_org_a_updated'
    WHERE organization_id = '00000000-0000-4000-8000-000000001001' AND livemode = false
  $sql$),
  'org admin cannot update own org customer ref'
);

SELECT pg_temp.ok(
  pg_temp.write_denied($sql$
    DELETE FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001001' AND livemode = false
  $sql$),
  'org admin cannot delete own org customer ref'
);

RESET ROLE;

-- The denied writes above changed nothing.
SELECT pg_temp.ok(
  (
    SELECT count(*) = 1 FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001001'
      AND livemode = false AND stripe_customer_id = 'cus_test_org_a'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001003'
  )
  AND (
    SELECT count(*) = 1 FROM public.user_stripe_customers
    WHERE user_id = '00000000-0000-4000-8000-00000000000d'
      AND livemode = false AND stripe_customer_id = 'cus_test_personal'
  ),
  'customer refs are unchanged after the denied writes'
);

-- service_role can still write the second mode for the same user.
SET LOCAL ROLE service_role;
-- ON CONFLICT DO NOTHING: only a leaked client write could have taken this
-- key, and that should fail the assertions above, not abort the run here.
INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
VALUES ('00000000-0000-4000-8000-00000000000d', true, 'cus_live_personal')
ON CONFLICT DO NOTHING;
RESET ROLE;

SELECT pg_temp.ok(
  (
    SELECT count(*) = 2 FROM public.user_stripe_customers
    WHERE user_id = '00000000-0000-4000-8000-00000000000d'
  ),
  'same user can store test and live customers'
);

-- ---------------------------------------------------------------------------
-- Format check: only customer ids ("cus_...") are stored
-- ---------------------------------------------------------------------------

SET LOCAL ROLE service_role;

SELECT pg_temp.ok(
  pg_temp.throws_check($sql$
    INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-000000001003', false, 'sub_x')
  $sql$),
  'org table rejects a stripe id that is not a customer id'
);

SELECT pg_temp.ok(
  pg_temp.throws_check($sql$
    INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
    VALUES ('00000000-0000-4000-8000-00000000000b', false, 'sub_x')
  $sql$),
  'user table rejects a stripe id that is not a customer id'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger. The statement sets an old updated_at itself, so the
-- value only moves forward if the BEFORE UPDATE trigger overrides it.
-- ---------------------------------------------------------------------------

UPDATE public.org_stripe_customers
SET stripe_customer_id = 'cus_test_org_b_touched', updated_at = '2000-01-01T00:00:00Z'
WHERE organization_id = '00000000-0000-4000-8000-000000001002' AND livemode = false;

SELECT pg_temp.ok(
  (
    SELECT updated_at > '2000-01-01T00:00:00Z' FROM public.org_stripe_customers
    WHERE organization_id = '00000000-0000-4000-8000-000000001002' AND livemode = false
  ),
  'org update moves updated_at forward'
);

UPDATE public.user_stripe_customers
SET stripe_customer_id = 'cus_test_admin_a_personal_touched', updated_at = '2000-01-01T00:00:00Z'
WHERE user_id = '00000000-0000-4000-8000-00000000000a' AND livemode = false;

SELECT pg_temp.ok(
  (
    SELECT updated_at > '2000-01-01T00:00:00Z' FROM public.user_stripe_customers
    WHERE user_id = '00000000-0000-4000-8000-00000000000a' AND livemode = false
  ),
  'user update moves updated_at forward'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Cascade: deleting the owner removes its refs. Uses its own org and user so
-- the earlier fixtures stay intact.
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-4000-8000-00000000000e', 'cascade-user@example.test');

INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000001004', 'Org D', 'org-d-stripe-customer-refs');

SET LOCAL ROLE service_role;

INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id) VALUES
  ('00000000-0000-4000-8000-000000001004', false, 'cus_test_org_d'),
  ('00000000-0000-4000-8000-000000001004', true, 'cus_live_org_d');

INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id) VALUES
  ('00000000-0000-4000-8000-00000000000e', false, 'cus_test_cascade_user'),
  ('00000000-0000-4000-8000-00000000000e', true, 'cus_live_cascade_user');

RESET ROLE;

SELECT pg_temp.assert_cascade(
  'deleting an org removes its customer refs',
  $sql$ DELETE FROM public.organizations WHERE id = '00000000-0000-4000-8000-000000001004' $sql$,
  'org_stripe_customers',
  'organization_id',
  '00000000-0000-4000-8000-000000001004'
);

SELECT pg_temp.assert_cascade(
  'deleting a user removes their customer refs',
  $sql$ DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-00000000000e' $sql$,
  'user_stripe_customers',
  'user_id',
  '00000000-0000-4000-8000-00000000000e'
);

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------

\echo
\echo '=== Stripe customer ref RLS results ==='
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  name,
  COALESCE(detail, '') AS detail
FROM stripe_refs_test_result
ORDER BY passed ASC, name;

\echo
SELECT
  COUNT(*) FILTER (WHERE passed) AS passed,
  COUNT(*) FILTER (WHERE NOT passed) AS failed,
  COUNT(*) AS total
FROM stripe_refs_test_result;

DO $$
DECLARE
  v_failed integer;
BEGIN
  SELECT COUNT(*) INTO v_failed FROM stripe_refs_test_result WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION '% Stripe customer ref assertion(s) failed', v_failed;
  END IF;
END
$$;

ROLLBACK;
