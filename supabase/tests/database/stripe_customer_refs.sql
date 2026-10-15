-- Valid TAP (plan/ok/finish) RLS and uniqueness tests for Stripe customer refs.
-- AC4: non-admins cannot read the org customer ref.
-- Writes are service_role only. Fake buyer emails only (buyer@example.test).
-- Run with: pg_prove supabase/tests/database/stripe_customer_refs.sql

CREATE OR REPLACE FUNCTION public.stripe_customer_refs_put_user(
  p_id uuid,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      p_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      'x',
      now(),
      now(),
      now(),
      '{}'::jsonb,
      '{}'::jsonb
    );
  EXCEPTION
    WHEN undefined_column THEN
      INSERT INTO auth.users (id, email) VALUES (p_id, p_email);
    WHEN unique_violation THEN
      NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.stripe_customer_refs_set_jwt(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.stripe_customer_refs_throws_unique(p_sql text)
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

CREATE OR REPLACE FUNCTION public.stripe_customer_refs_write_error(p_sql text)
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
  WHEN OTHERS THEN
    RETURN true;
END;
$$;

DO $tap$
BEGIN
  IF to_regprocedure('plan(integer)') IS NULL THEN
    CREATE FUNCTION plan(integer)
    RETURNS text
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      PERFORM set_config('tap.planned', $1::text, true);
      PERFORM set_config('tap.ran', '0', true);
      PERFORM set_config('tap.failed', '0', true);
      RETURN '1..' || $1;
    END;
    $fn$;
  END IF;

  IF to_regprocedure('ok(boolean,text)') IS NULL THEN
    CREATE FUNCTION ok(boolean, text)
    RETURNS text
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      n integer;
    BEGIN
      n := COALESCE(NULLIF(current_setting('tap.ran', true), ''), '0')::integer + 1;
      PERFORM set_config('tap.ran', n::text, true);
      IF $1 IS TRUE THEN
        RETURN 'ok ' || n || ' - ' || $2;
      END IF;
      PERFORM set_config(
        'tap.failed',
        (COALESCE(NULLIF(current_setting('tap.failed', true), ''), '0')::integer + 1)::text,
        true
      );
      RETURN 'not ok ' || n || ' - ' || $2;
    END;
    $fn$;
  END IF;

  IF to_regprocedure('finish()') IS NULL THEN
    CREATE FUNCTION finish()
    RETURNS SETOF text
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      planned integer;
      ran integer;
      failed integer;
    BEGIN
      planned := COALESCE(NULLIF(current_setting('tap.planned', true), ''), '0')::integer;
      ran := COALESCE(NULLIF(current_setting('tap.ran', true), ''), '0')::integer;
      failed := COALESCE(NULLIF(current_setting('tap.failed', true), ''), '0')::integer;
      IF ran <> planned THEN
        RETURN NEXT 'not ok - planned ' || planned || ' but ran ' || ran;
        failed := failed + 1;
      END IF;
      IF failed = 0 THEN
        RETURN NEXT '# pass ' || ran;
      ELSE
        RETURN NEXT '# fail ' || failed;
      END IF;
    END;
    $fn$;
  END IF;
END;
$tap$;

BEGIN;

SELECT plan(16);

SELECT public.stripe_customer_refs_put_user(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'buyer@example.test'
);
SELECT public.stripe_customer_refs_put_user(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'member@example.test'
);
SELECT public.stripe_customer_refs_put_user(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
  'buyer@example.test'
);
SELECT public.stripe_customer_refs_put_user(
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
  'personal@example.test'
);

INSERT INTO public.organizations (id, name, slug)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Org A', 'org-a-stripe-customer-refs'),
  ('22222222-2222-4222-8222-222222222222', 'Org B', 'org-b-stripe-customer-refs'),
  ('33333333-3333-4333-8333-333333333333', 'Org C', 'org-c-stripe-customer-refs')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'admin'),
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'member'),
  ('22222222-2222-4222-8222-222222222222', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'admin')
ON CONFLICT (organization_id, user_id) DO NOTHING;

INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
VALUES
  ('11111111-1111-4111-8111-111111111111', false, 'cus_test_org_a'),
  ('22222222-2222-4222-8222-222222222222', false, 'cus_test_org_b');

INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', false, 'cus_test_personal'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false, 'cus_test_admin_a_personal');

SELECT ok(
  public.stripe_customer_refs_throws_unique(
    $sql$
      INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
      VALUES ('11111111-1111-4111-8111-111111111111', false, 'cus_test_org_a_dup')
    $sql$
  ),
  'org owner unique rejects a second row for the same livemode'
);

INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
VALUES ('11111111-1111-4111-8111-111111111111', true, 'cus_live_org_a');

SELECT ok(
  (
    SELECT count(*) = 2
    FROM public.org_stripe_customers
    WHERE organization_id = '11111111-1111-4111-8111-111111111111'
  ),
  'same org can store test and live customers'
);

SELECT ok(
  public.stripe_customer_refs_throws_unique(
    $sql$
      INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
      VALUES ('33333333-3333-4333-8333-333333333333', false, 'cus_test_org_a')
    $sql$
  ),
  'org stripe_customer_id is unique'
);

SELECT ok(
  public.stripe_customer_refs_throws_unique(
    $sql$
      INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
      VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', false, 'cus_test_personal_dup')
    $sql$
  ),
  'user owner unique rejects a second row for the same livemode'
);

INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', true, 'cus_live_personal');

SELECT ok(
  (
    SELECT count(*) = 2
    FROM public.user_stripe_customers
    WHERE user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  'same user can store test and live customers'
);

SELECT public.stripe_customer_refs_set_jwt('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SET LOCAL ROLE authenticated;

SELECT ok(
  (
    SELECT count(*) = 2
    FROM public.org_stripe_customers
    WHERE organization_id = '11111111-1111-4111-8111-111111111111'
  ),
  'org admin can read own org customer ref'
);

SELECT ok(
  (
    SELECT count(*) = 0
    FROM public.org_stripe_customers
    WHERE organization_id = '22222222-2222-4222-8222-222222222222'
  ),
  'org admin cannot read another org customer ref'
);

RESET ROLE;
SELECT public.stripe_customer_refs_set_jwt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
SET LOCAL ROLE authenticated;

SELECT ok(
  (
    SELECT count(*) = 0
    FROM public.org_stripe_customers
    WHERE organization_id = '11111111-1111-4111-8111-111111111111'
  ),
  'AC4 non-admin cannot read org customer ref'
);

RESET ROLE;
SELECT public.stripe_customer_refs_set_jwt('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
SET LOCAL ROLE authenticated;

SELECT ok(
  (
    SELECT count(*) = 2
    FROM public.user_stripe_customers
    WHERE user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ),
  'user can read own customer ref'
);

SELECT ok(
  (
    SELECT count(*) = 0
    FROM public.user_stripe_customers
    WHERE user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  'user cannot read another user customer ref'
);

SELECT ok(
  public.stripe_customer_refs_write_error(
    $sql$
      INSERT INTO public.org_stripe_customers (organization_id, livemode, stripe_customer_id)
      VALUES ('33333333-3333-4333-8333-333333333333', false, 'cus_test_should_fail')
    $sql$
  ),
  'authenticated cannot insert org customer ref'
);

SELECT ok(
  public.stripe_customer_refs_write_error(
    $sql$
      UPDATE public.org_stripe_customers
      SET stripe_customer_id = 'cus_test_updated'
      WHERE organization_id = '11111111-1111-4111-8111-111111111111'
        AND livemode = false
    $sql$
  ),
  'authenticated cannot update org customer ref'
);

SELECT ok(
  public.stripe_customer_refs_write_error(
    $sql$
      DELETE FROM public.org_stripe_customers
      WHERE organization_id = '11111111-1111-4111-8111-111111111111'
        AND livemode = false
    $sql$
  ),
  'authenticated cannot delete org customer ref'
);

SELECT ok(
  public.stripe_customer_refs_write_error(
    $sql$
      INSERT INTO public.user_stripe_customers (user_id, livemode, stripe_customer_id)
      VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false, 'cus_test_user_should_fail')
    $sql$
  ),
  'authenticated cannot insert user customer ref'
);

RESET ROLE;

SELECT ok(
  (
    SELECT count(*) = 1
    FROM public.org_stripe_customers
    WHERE organization_id = '11111111-1111-4111-8111-111111111111'
      AND livemode = false
      AND stripe_customer_id = 'cus_test_org_a'
  ),
  'org customer ref unchanged after denied writes'
);

SELECT * FROM finish();

ROLLBACK;
