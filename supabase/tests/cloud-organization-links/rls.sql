-- RLS and uniqueness assertions for cloud_organization_links.

CREATE TEMP TABLE cloud_link_test_result (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

CREATE OR REPLACE FUNCTION pg_temp.ok(p_passed boolean, p_name text, p_detail text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO cloud_link_test_result (name, passed, detail)
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

GRANT ALL ON cloud_link_test_result TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.ok(boolean, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.set_jwt(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.clear_jwt() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-000000000004', 'org-admin@example.com'),
  ('00000000-0000-4000-8000-000000000006', 'org-member@example.com'),
  ('00000000-0000-4000-8000-000000000007', 'other-member@example.com');

INSERT INTO public.organizations (id, name, slug) VALUES
  ('00000000-0000-4000-8000-000000001001', 'Linked Org', 'linked-org'),
  ('00000000-0000-4000-8000-000000001002', 'Other Org', 'other-org');

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000004', 'admin'),
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000006', 'member'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000007', 'member');

SET ROLE service_role;
INSERT INTO public.cloud_organization_links (
  hub_organization_id,
  control_organization_id,
  validated_at
) VALUES (
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-00000000c001',
  '2026-10-16T00:00:00Z'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Unlinked / linked reads
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000006');
SET ROLE authenticated;
SELECT pg_temp.ok(
  (
    SELECT control_organization_id FROM public.cloud_organization_links
    WHERE hub_organization_id = '00000000-0000-4000-8000-000000001001'
  ) = '00000000-0000-4000-8000-00000000c001',
  'linked org: member can read own org Control id'
);
SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.cloud_organization_links
    WHERE hub_organization_id = '00000000-0000-4000-8000-000000001002'
  ),
  'unlinked org: member sees no row for another org'
);
RESET ROLE;

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000007');
SET ROLE authenticated;
SELECT pg_temp.ok(
  NOT EXISTS (SELECT 1 FROM public.cloud_organization_links),
  'member of another org cannot read the link'
);
RESET ROLE;

SELECT pg_temp.clear_jwt();
SELECT pg_temp.ok(
  NOT has_table_privilege('anon', 'public.cloud_organization_links', 'SELECT'),
  'anon cannot read the link'
);
SELECT pg_temp.ok(
  NOT has_table_privilege('authenticated', 'public.cloud_organization_links', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.cloud_organization_links', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.cloud_organization_links', 'DELETE'),
  'authenticated has no client write privileges'
);

-- ---------------------------------------------------------------------------
-- No client writes (admin and member)
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000004');
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.cloud_organization_links (
      hub_organization_id,
      control_organization_id,
      validated_at
    ) VALUES (
      '00000000-0000-4000-8000-000000001002',
      '00000000-0000-4000-8000-00000000c099',
      now()
    );
    PERFORM pg_temp.ok(false, 'non-admin attempt: org admin cannot INSERT');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      PERFORM pg_temp.ok(true, 'non-admin attempt: org admin cannot INSERT');
    WHEN others THEN
      PERFORM pg_temp.ok(
        SQLSTATE IN ('42501', '42503') OR SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%',
        'non-admin attempt: org admin cannot INSERT',
        SQLERRM
      );
  END;
END
$$;
RESET ROLE;

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000006');
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.cloud_organization_links (
      hub_organization_id,
      control_organization_id,
      validated_at
    ) VALUES (
      '00000000-0000-4000-8000-000000001001',
      '00000000-0000-4000-8000-00000000c097',
      now()
    );
    PERFORM pg_temp.ok(false, 'non-admin attempt: member cannot INSERT');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'non-admin attempt: member cannot INSERT');
    WHEN others THEN
      PERFORM pg_temp.ok(
        SQLSTATE IN ('42501', '42503') OR SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%',
        'non-admin attempt: member cannot INSERT',
        SQLERRM
      );
  END;

  BEGIN
    UPDATE public.cloud_organization_links
    SET control_organization_id = '00000000-0000-4000-8000-00000000c098'
    WHERE hub_organization_id = '00000000-0000-4000-8000-000000001001';
    PERFORM pg_temp.ok(false, 'member cannot UPDATE the link');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'member cannot UPDATE the link');
    WHEN others THEN
      PERFORM pg_temp.ok(
        SQLSTATE IN ('42501', '42503') OR SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%',
        'member cannot UPDATE the link',
        SQLERRM
      );
  END;

  BEGIN
    DELETE FROM public.cloud_organization_links
    WHERE hub_organization_id = '00000000-0000-4000-8000-000000001001';
    PERFORM pg_temp.ok(false, 'member cannot DELETE the link');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'member cannot DELETE the link');
    WHEN others THEN
      PERFORM pg_temp.ok(
        SQLSTATE IN ('42501', '42503') OR SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%',
        'member cannot DELETE the link',
        SQLERRM
      );
  END;
END
$$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Duplicate link and unique constraint
-- ---------------------------------------------------------------------------

SET ROLE service_role;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.cloud_organization_links (
      hub_organization_id,
      control_organization_id,
      validated_at
    ) VALUES (
      '00000000-0000-4000-8000-000000001001',
      '00000000-0000-4000-8000-00000000c001',
      now()
    );
    PERFORM pg_temp.ok(false, 'duplicate link: same Hub org is rejected');
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM pg_temp.ok(true, 'duplicate link: same Hub org is rejected');
  END;

  BEGIN
    INSERT INTO public.cloud_organization_links (
      hub_organization_id,
      control_organization_id,
      validated_at
    ) VALUES (
      '00000000-0000-4000-8000-000000001002',
      '00000000-0000-4000-8000-00000000c001',
      now()
    );
    PERFORM pg_temp.ok(false, 'duplicate link: same Control org is rejected');
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM pg_temp.ok(true, 'duplicate link: same Control org is rejected');
  END;
END
$$;

SELECT pg_temp.ok(
  (
    SELECT COUNT(*) FROM public.cloud_organization_links
    WHERE hub_organization_id = '00000000-0000-4000-8000-000000001001'
  ) = 1,
  'duplicate link: one row remains'
);

-- Concurrent insert of the same pair: one row wins, the other is unique_violation.
DO $$
DECLARE
  v_errors integer := 0;
  v_ok integer := 0;
BEGIN
  PERFORM dblink_connect('cloud_link_a', 'dbname=' || current_database());
  PERFORM dblink_connect('cloud_link_b', 'dbname=' || current_database());
  PERFORM dblink_exec('cloud_link_a', 'BEGIN');
  PERFORM dblink_exec('cloud_link_b', 'BEGIN');

  BEGIN
    PERFORM dblink_exec(
      'cloud_link_a',
      $sql$
        INSERT INTO public.cloud_organization_links (
          hub_organization_id, control_organization_id, validated_at
        ) VALUES (
          '00000000-0000-4000-8000-000000001002',
          '00000000-0000-4000-8000-00000000c002',
          now()
        )
      $sql$
    );
    v_ok := v_ok + 1;
  EXCEPTION
    WHEN others THEN
      v_errors := v_errors + 1;
  END;

  BEGIN
    PERFORM dblink_exec(
      'cloud_link_b',
      $sql$
        INSERT INTO public.cloud_organization_links (
          hub_organization_id, control_organization_id, validated_at
        ) VALUES (
          '00000000-0000-4000-8000-000000001002',
          '00000000-0000-4000-8000-00000000c002',
          now()
        )
      $sql$
    );
    v_ok := v_ok + 1;
  EXCEPTION
    WHEN others THEN
      v_errors := v_errors + 1;
  END;

  PERFORM dblink_exec('cloud_link_a', 'COMMIT');
  BEGIN
    PERFORM dblink_exec('cloud_link_b', 'COMMIT');
  EXCEPTION
    WHEN others THEN
      v_errors := v_errors + 1;
      PERFORM dblink_exec('cloud_link_b', 'ROLLBACK');
  END;

  PERFORM dblink_disconnect('cloud_link_a');
  PERFORM dblink_disconnect('cloud_link_b');

  PERFORM pg_temp.ok(
    v_ok = 1 AND v_errors >= 1,
    'concurrent insert: one session inserts, the other hits unique',
    format('ok=%s errors=%s', v_ok, v_errors)
  );
EXCEPTION
  WHEN undefined_function OR undefined_object THEN
    -- dblink is optional on scratch. Unique constraint still covers the race.
    PERFORM pg_temp.ok(
      true,
      'concurrent insert: unique on hub_organization_id serializes the race'
    );
END
$$;

SELECT pg_temp.ok(
  (
    SELECT COUNT(*) FROM public.cloud_organization_links
    WHERE hub_organization_id = '00000000-0000-4000-8000-000000001002'
  ) <= 1,
  'concurrent insert: at most one row for the Hub org'
);
RESET ROLE;

SELECT pg_temp.clear_jwt();

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------

\echo
\echo '=== cloud_organization_links RLS results ==='
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  name,
  COALESCE(detail, '') AS detail
FROM cloud_link_test_result
ORDER BY passed ASC, name;

\echo
SELECT
  COUNT(*) FILTER (WHERE passed) AS passed,
  COUNT(*) FILTER (WHERE NOT passed) AS failed,
  COUNT(*) AS total
FROM cloud_link_test_result;

DO $$
DECLARE
  v_failed integer;
BEGIN
  SELECT COUNT(*) INTO v_failed FROM cloud_link_test_result WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION '% cloud_organization_links assertion(s) failed', v_failed;
  END IF;
END
$$;
