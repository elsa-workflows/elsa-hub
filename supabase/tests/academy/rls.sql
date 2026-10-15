-- Academy RLS and grant assertions. Run after academy migrations.
-- Intended for a scratch database seeded below, or a local Supabase with
-- the same fixture ids.

CREATE TEMP TABLE academy_test_result (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

CREATE OR REPLACE FUNCTION pg_temp.ok(p_passed boolean, p_name text, p_detail text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO academy_test_result (name, passed, detail)
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

GRANT ALL ON academy_test_result TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.ok(boolean, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.set_jwt(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.clear_jwt() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'entitled@example.com'),
  ('00000000-0000-4000-8000-000000000003', 'unentitled@example.com'),
  ('00000000-0000-4000-8000-000000000004', 'org-admin@example.com'),
  ('00000000-0000-4000-8000-000000000005', 'org-seat@example.com'),
  ('00000000-0000-4000-8000-000000000006', 'org-member@example.com'),
  ('00000000-0000-4000-8000-000000000007', 'unknown-sku@example.com'),
  ('00000000-0000-4000-8000-000000000008', 'bundle-match@example.com');

INSERT INTO public.platform_admins (user_id)
VALUES ('00000000-0000-4000-8000-000000000001');

INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000001001', 'Academy Org', 'academy-org');

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000004', 'admin'),
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000005', 'member'),
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000006', 'member');

INSERT INTO public.academy_courses (
  id, slug, title, summary, sort_order, is_published, price_cents, currency,
  product_code, product_codes
) VALUES
  (
    '00000000-0000-4000-8000-000000002001',
    'published-course',
    'Published Course',
    'A published catalog course',
    1,
    true,
    4900,
    'eur',
    'solo_bundle',
    ARRAY['solo_bundle', 'team_5', 'team_10']
  ),
  (
    '00000000-0000-4000-8000-000000002002',
    'unpublished-course',
    'Unpublished Course',
    'Hidden from the catalog',
    2,
    false,
    4900,
    'eur',
    'team_5',
    ARRAY['team_5', 'solo_bundle']
  );

INSERT INTO public.academy_courses (
  id, slug, title, summary, sort_order, is_published, price_cents, currency,
  product_code, product_codes
) VALUES (
  '00000000-0000-4000-8000-000000002003',
  'fundamentals-core',
  'Fundamentals Core',
  'Eight-lesson published outline course',
  3,
  true,
  2900,
  'eur',
  'solo_bundle',
  ARRAY['solo_bundle']
);

INSERT INTO public.academy_lessons (
  id, course_id, slug, title, sort_order, body_md, is_preview, duration_minutes
) VALUES
  (
    '00000000-0000-4000-8000-000000003001',
    '00000000-0000-4000-8000-000000002001',
    'welcome',
    'Welcome',
    1,
    'PREVIEW BODY',
    true,
    8
  ),
  (
    '00000000-0000-4000-8000-000000003002',
    '00000000-0000-4000-8000-000000002001',
    'paid-lesson',
    'Paid Lesson',
    2,
    'PAID BODY',
    false,
    25
  ),
  (
    '00000000-0000-4000-8000-000000003003',
    '00000000-0000-4000-8000-000000002002',
    'draft-preview',
    'Draft Preview',
    1,
    'UNPUBLISHED PREVIEW BODY',
    true,
    5
  ),
  (
    '00000000-0000-4000-8000-000000003004',
    '00000000-0000-4000-8000-000000002002',
    'draft-paid',
    'Draft Paid Lesson',
    2,
    'DRAFT PAID BODY',
    false,
    15
  );

INSERT INTO public.academy_lessons (
  id, course_id, slug, title, sort_order, body_md, is_preview, duration_minutes
)
SELECT
  ('00000000-0000-4000-8000-00000000301' || gs)::uuid,
  '00000000-0000-4000-8000-000000002003',
  'core-lesson-' || gs,
  'Core Lesson ' || gs,
  gs,
  'CORE BODY ' || gs,
  gs = 1,
  10
FROM generate_series(1, 8) AS gs;

INSERT INTO public.academy_assets (
  id, course_id, lesson_id, label, storage_path, sha256, size_bytes
) VALUES (
  '00000000-0000-4000-8000-000000003101',
  '00000000-0000-4000-8000-000000002001',
  '00000000-0000-4000-8000-000000003002',
  'Course kit',
  '00000000-0000-4000-8000-000000002001/kit.zip',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  1024
);

INSERT INTO storage.objects (bucket_id, name)
VALUES ('academy-kits', '00000000-0000-4000-8000-000000002001/kit.zip');

INSERT INTO public.academy_entitlements (
  id, course_id, product_code, subject_type, user_id, organization_id,
  seats, source, stripe_checkout_session_id, granted_at, revoked_at
) VALUES
  (
    '00000000-0000-4000-8000-000000004001',
    '00000000-0000-4000-8000-000000002001',
    'solo_bundle',
    'user',
    '00000000-0000-4000-8000-000000000002',
    NULL,
    1,
    'stripe',
    'cs_test_personal',
    now(),
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000004002',
    NULL,
    'team_5',
    'org',
    NULL,
    '00000000-0000-4000-8000-000000001001',
    1,
    'stripe',
    'cs_test_org',
    now(),
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000004003',
    '00000000-0000-4000-8000-000000002001',
    'solo_bundle',
    'user',
    '00000000-0000-4000-8000-000000000003',
    NULL,
    1,
    'manual',
    NULL,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000004004',
    NULL,
    'anything_at_all',
    'user',
    '00000000-0000-4000-8000-000000000007',
    NULL,
    1,
    'manual',
    NULL,
    now(),
    NULL
  ),
  (
    '00000000-0000-4000-8000-000000004005',
    NULL,
    'solo_bundle',
    'user',
    '00000000-0000-4000-8000-000000000008',
    NULL,
    1,
    'manual',
    NULL,
    now(),
    NULL
  );

INSERT INTO public.academy_seat_assignments (entitlement_id, user_id)
VALUES (
  '00000000-0000-4000-8000-000000004002',
  '00000000-0000-4000-8000-000000000005'
);

-- ---------------------------------------------------------------------------
-- Constraint checks
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  BEGIN
    INSERT INTO public.academy_assets (
      course_id, label, storage_path, sha256
    ) VALUES (
      '00000000-0000-4000-8000-000000002001',
      'bad hash',
      'bad/sha',
      'not-a-sha256'
    );
    PERFORM pg_temp.ok(false, 'sha256 rejects non-hex');
  EXCEPTION
    WHEN check_violation THEN
      PERFORM pg_temp.ok(true, 'sha256 rejects non-hex');
  END;

  BEGIN
    INSERT INTO public.academy_lessons (
      course_id, slug, title, duration_minutes
    ) VALUES (
      '00000000-0000-4000-8000-000000002001',
      'zero-duration',
      'Zero',
      0
    );
    PERFORM pg_temp.ok(false, 'duration_minutes rejects zero');
  EXCEPTION
    WHEN check_violation THEN
      PERFORM pg_temp.ok(true, 'duration_minutes rejects zero');
  END;

  BEGIN
    INSERT INTO public.academy_courses (
      slug, title, product_code
    ) VALUES (
      'bad-code',
      'Bad',
      'Solo-Bundle'
    );
    PERFORM pg_temp.ok(false, 'product_code rejects mixed case');
  EXCEPTION
    WHEN check_violation THEN
      PERFORM pg_temp.ok(true, 'product_code rejects mixed case');
  END;

  BEGIN
    INSERT INTO public.academy_entitlements (
      course_id, subject_type, user_id, organization_id, seats, source
    ) VALUES (
      '00000000-0000-4000-8000-000000002001',
      'user',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000001001',
      1,
      'manual'
    );
    PERFORM pg_temp.ok(false, 'entitlement xor user/org');
  EXCEPTION
    WHEN check_violation THEN
      PERFORM pg_temp.ok(true, 'entitlement xor user/org');
  END;
END
$$;

-- ---------------------------------------------------------------------------
-- Stripe checkout session idempotency (service_role grant path)
-- ---------------------------------------------------------------------------

SET ROLE service_role;

INSERT INTO public.academy_entitlements (
  course_id, product_code, subject_type, user_id, organization_id,
  seats, source, stripe_checkout_session_id
) VALUES (
  '00000000-0000-4000-8000-000000002001',
  'solo_bundle',
  'user',
  '00000000-0000-4000-8000-000000000002',
  NULL,
  1,
  'stripe',
  'cs_test_replay'
)
ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

INSERT INTO public.academy_entitlements (
  course_id, product_code, subject_type, user_id, organization_id,
  seats, source, stripe_checkout_session_id
) VALUES (
  '00000000-0000-4000-8000-000000002001',
  'solo_bundle',
  'user',
  '00000000-0000-4000-8000-000000000002',
  NULL,
  1,
  'stripe',
  'cs_test_replay'
)
ON CONFLICT (stripe_checkout_session_id) DO NOTHING;

RESET ROLE;

SELECT pg_temp.ok(
  (
    SELECT COUNT(*)
    FROM public.academy_entitlements
    WHERE stripe_checkout_session_id = 'cs_test_replay'
  ) = 1,
  'replayed stripe session inserts exactly one row'
);

-- ---------------------------------------------------------------------------
-- Anon: published metadata and preview body only
-- ---------------------------------------------------------------------------

SELECT pg_temp.clear_jwt();
SET ROLE anon;

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_courses
    WHERE id = '00000000-0000-4000-8000-000000002001'
  ),
  'anon reads published course'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_courses
    WHERE id = '00000000-0000-4000-8000-000000002002'
  ),
  'anon cannot read unpublished course'
);

SELECT pg_temp.ok(
  (
    SELECT body_md FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003001'
  ) = 'PREVIEW BODY',
  'anon reads preview lesson body'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ),
  'anon cannot read paid lesson row'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE body_md = 'PAID BODY'
  ),
  'anon cannot read paid lesson body'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003003'
  ),
  'anon cannot read unpublished preview lesson'
);

SELECT pg_temp.ok(
  (
    SELECT count(*) FROM public.academy_course_outline('00000000-0000-4000-8000-000000002003')
  ) = 8,
  'anon outline returns all 8 Core lessons'
);

SELECT pg_temp.ok(
  (
    SELECT count(*) FROM public.academy_lessons
    WHERE course_id = '00000000-0000-4000-8000-000000002003'
  ) = 1,
  'anon table still hides paid Core lessons'
);

SELECT pg_temp.ok(
  (
    SELECT array_agg(key ORDER BY key)
    FROM jsonb_each(
      to_jsonb((SELECT r FROM public.academy_course_outline('00000000-0000-4000-8000-000000002003') AS r LIMIT 1))
    ) AS each(key, value)
  ) = ARRAY['id', 'is_preview', 'slug', 'sort_order', 'title']::text[],
  'anon outline has no body columns'
);

SELECT pg_temp.ok(
  (
    SELECT count(*) FROM public.academy_course_outline('00000000-0000-4000-8000-000000002002')
  ) = 0,
  'anon outline hides unpublished courses'
);

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.academy_assets;
    PERFORM pg_temp.ok(
      NOT EXISTS (SELECT 1 FROM public.academy_assets),
      'anon cannot read assets'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'anon cannot read assets');
  END;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.academy_courses (slug, title, product_code)
    VALUES ('anon-write', 'Nope', 'solo_bundle');
    PERFORM pg_temp.ok(false, 'anon cannot insert course');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      PERFORM pg_temp.ok(true, 'anon cannot insert course');
  END;

  BEGIN
    UPDATE public.academy_lessons SET title = 'hacked' WHERE is_preview;
    PERFORM pg_temp.ok(false, 'anon cannot update lesson');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'anon cannot update lesson');
  END;

  BEGIN
    DELETE FROM public.academy_courses WHERE is_published;
    PERFORM pg_temp.ok(false, 'anon cannot delete course');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'anon cannot delete course');
  END;
END
$$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Authenticated, no entitlement
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000003');
SET ROLE authenticated;

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_courses
    WHERE id = '00000000-0000-4000-8000-000000002001'
  ),
  'unentitled user reads published course'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_courses
    WHERE id = '00000000-0000-4000-8000-000000002002'
  ),
  'unentitled user cannot read unpublished course'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ),
  'unentitled user cannot read paid lesson body'
);

SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'revoked entitlement does not grant access'
);

SELECT pg_temp.ok(
  NOT EXISTS (SELECT 1 FROM public.academy_assets),
  'unentitled user cannot read assets'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE user_id = '00000000-0000-4000-8000-000000000002'
  ),
  'unentitled user cannot read someone else entitlement'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.academy_entitlements (
      course_id, subject_type, user_id, seats, source
    ) VALUES (
      '00000000-0000-4000-8000-000000002001',
      'user',
      '00000000-0000-4000-8000-000000000003',
      1,
      'manual'
    );
    PERFORM pg_temp.ok(false, 'authenticated cannot insert entitlement');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'authenticated cannot insert entitlement');
  END;

  BEGIN
    INSERT INTO public.academy_seat_assignments (
      entitlement_id, user_id
    ) VALUES (
      '00000000-0000-4000-8000-000000004002',
      '00000000-0000-4000-8000-000000000006'
    );
    PERFORM pg_temp.ok(false, 'authenticated cannot insert seat assignment');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'authenticated cannot insert seat assignment');
  END;

  BEGIN
    UPDATE public.academy_courses SET title = 'hacked' WHERE is_published;
    PERFORM pg_temp.ok(false, 'authenticated cannot update course');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'authenticated cannot update course');
  END;

  BEGIN
    DELETE FROM public.academy_lessons WHERE is_preview;
    PERFORM pg_temp.ok(false, 'authenticated cannot delete lesson');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.ok(true, 'authenticated cannot delete lesson');
  END;
END
$$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Personal entitlement
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000002');
SET ROLE authenticated;

SELECT pg_temp.ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'personal entitlement grants has_academy_access'
);

SELECT pg_temp.ok(
  (
    SELECT body_md FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ) = 'PAID BODY',
  'personal entitlement reads paid lesson body'
);

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_assets
    WHERE id = '00000000-0000-4000-8000-000000003101'
  ),
  'personal entitlement reads asset row'
);

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'academy-kits'
      AND name = '00000000-0000-4000-8000-000000002001/kit.zip'
  ),
  'personal entitlement reads academy-kits object'
);

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE id = '00000000-0000-4000-8000-000000004001'
  ),
  'user can read own entitlement'
);

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Org seat
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000005');
SET ROLE authenticated;

SELECT pg_temp.ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'org seat grants has_academy_access'
);

SELECT pg_temp.ok(
  (
    SELECT body_md FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ) = 'PAID BODY',
  'org seat reads paid lesson body'
);

RESET ROLE;

-- Org member without a seat
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000006');
SET ROLE authenticated;

SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'org member without a seat has no access'
);

SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ),
  'org member without a seat cannot read paid body'
);

SELECT pg_temp.ok(
  NOT EXISTS (SELECT 1 FROM public.academy_entitlements),
  'org member cannot read org entitlement'
);

RESET ROLE;

-- Org admin can read org entitlement and assign seats
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000004');
SET ROLE authenticated;

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE id = '00000000-0000-4000-8000-000000004002'
  ),
  'org admin can read org entitlement'
);

SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'org admin without a seat has no content access'
);

DO $$
DECLARE
  v_id uuid;
BEGIN
  BEGIN
    v_id := public.assign_academy_seat(
      '00000000-0000-4000-8000-000000004002',
      '00000000-0000-4000-8000-000000000006'
    );
    PERFORM pg_temp.ok(false, 'org admin cannot exceed seat limit via RPC');
  EXCEPTION
    WHEN others THEN
      PERFORM pg_temp.ok(
        SQLERRM LIKE 'seat limit%',
        'org admin cannot exceed seat limit via RPC',
        SQLERRM
      );
  END;
END
$$;

-- Free the seat, assign the other member, confirm access flips
SELECT public.unassign_academy_seat(
  '00000000-0000-4000-8000-000000004002',
  '00000000-0000-4000-8000-000000000005'
);

SELECT pg_temp.ok(
  public.assign_academy_seat(
    '00000000-0000-4000-8000-000000004002',
    '00000000-0000-4000-8000-000000000006'
  ) IS NOT NULL,
  'org admin assigns a seat via RPC'
);

RESET ROLE;

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000006');
SET ROLE authenticated;
SELECT pg_temp.ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'newly seated member has access'
);
SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002002'),
  'draft course gets no access via seat for non-admins'
);
SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003004'
  ),
  'draft paid body is hidden from seated non-admin'
);
RESET ROLE;

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000005');
SET ROLE authenticated;
SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'unassigned member loses access'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Platform admin
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000001');
SET ROLE authenticated;

SELECT pg_temp.ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'platform admin has_academy_access'
);

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_courses
    WHERE id = '00000000-0000-4000-8000-000000002002'
  ),
  'platform admin reads unpublished course'
);

SELECT pg_temp.ok(
  (
    SELECT body_md FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ) = 'PAID BODY',
  'platform admin reads paid lesson body'
);

SELECT pg_temp.ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002002'),
  'platform admin can access draft course'
);

RESET ROLE;
SELECT pg_temp.clear_jwt();

-- ---------------------------------------------------------------------------
-- Bundle SKU matching
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000007');
SET ROLE authenticated;
SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'unknown product_code gets no access'
);
SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002002'),
  'unknown product_code gets no draft access'
);
SELECT pg_temp.ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE body_md IN ('PAID BODY', 'DRAFT PAID BODY')
  ),
  'unknown product_code cannot read paid bodies'
);
RESET ROLE;

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000008');
SET ROLE authenticated;
SELECT pg_temp.ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'matching product_code gets access'
);
SELECT pg_temp.ok(
  (
    SELECT body_md FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ) = 'PAID BODY',
  'matching product_code reads paid lesson body'
);
SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002002'),
  'draft course gets no access via bundle for non-admins'
);
RESET ROLE;

-- Unentitled caller is rejected before entitlement lookup
SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000003');
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.assign_academy_seat(
      '00000000-0000-4000-8000-000000004002',
      '00000000-0000-4000-8000-000000000005'
    );
    PERFORM pg_temp.ok(false, 'unentitled user cannot assign seats');
  EXCEPTION
    WHEN others THEN
      PERFORM pg_temp.ok(
        SQLERRM LIKE 'not authorized%',
        'unentitled user cannot assign seats',
        SQLERRM
      );
  END;
END
$$;
RESET ROLE;

-- Removing org membership drops seat access; the assignment row can remain
DELETE FROM public.organization_members
WHERE organization_id = '00000000-0000-4000-8000-000000001001'
  AND user_id = '00000000-0000-4000-8000-000000000006';

SELECT pg_temp.set_jwt('00000000-0000-4000-8000-000000000006');
SET ROLE authenticated;
SELECT pg_temp.ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'removed member loses access'
);
RESET ROLE;

SELECT pg_temp.ok(
  EXISTS (
    SELECT 1 FROM public.academy_seat_assignments
    WHERE entitlement_id = '00000000-0000-4000-8000-000000004002'
      AND user_id = '00000000-0000-4000-8000-000000000006'
  ),
  'removed member seat row remains until unassigned'
);

SELECT pg_temp.ok(
  has_function_privilege('anon', 'public.academy_course_outline(uuid)', 'execute'),
  'anon can execute academy_course_outline'
);
SELECT pg_temp.ok(
  has_function_privilege('authenticated', 'public.academy_course_outline(uuid)', 'execute'),
  'authenticated can execute academy_course_outline'
);
SELECT pg_temp.ok(
  NOT has_function_privilege('anon', 'public.has_academy_access(uuid)', 'execute'),
  'anon cannot execute has_academy_access'
);
SELECT pg_temp.ok(
  NOT has_function_privilege('anon', 'public.assign_academy_seat(uuid,uuid)', 'execute'),
  'anon cannot execute assign_academy_seat'
);
SELECT pg_temp.ok(
  NOT has_function_privilege('anon', 'public.unassign_academy_seat(uuid,uuid)', 'execute'),
  'anon cannot execute unassign_academy_seat'
);
SELECT pg_temp.ok(
  (
    SELECT
      CASE
        WHEN p.proacl IS NULL THEN false
        ELSE NOT EXISTS (
          SELECT 1
          FROM aclexplode(p.proacl) AS grant_row
          WHERE grant_row.grantee = 0
            AND grant_row.privilege_type = 'EXECUTE'
        )
      END
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'assign_academy_seat'
  ),
  'PUBLIC cannot execute assign_academy_seat'
);

SELECT pg_temp.clear_jwt();

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------

\echo
\echo '=== academy RLS results ==='
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  name,
  COALESCE(detail, '') AS detail
FROM academy_test_result
ORDER BY passed ASC, name;

\echo
SELECT
  COUNT(*) FILTER (WHERE passed) AS passed,
  COUNT(*) FILTER (WHERE NOT passed) AS failed,
  COUNT(*) AS total
FROM academy_test_result;

DO $$
DECLARE
  v_failed integer;
BEGIN
  SELECT COUNT(*) INTO v_failed FROM academy_test_result WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION '% academy assertion(s) failed', v_failed;
  END IF;
END
$$;
