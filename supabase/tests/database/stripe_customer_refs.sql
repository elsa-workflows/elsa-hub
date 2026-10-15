-- pgTAP-style RLS and uniqueness tests for org and user Stripe customer refs.
-- AC4: non-admins cannot read the org customer ref.
-- Writes are service_role only (no INSERT/UPDATE/DELETE policies for authenticated).
-- Fake buyer emails only (buyer@example.test).
--
-- Intended for `supabase test db`. Each check raises on failure, same idea as
-- pgTAP ok()/is() without requiring the extension to already be installed.

CREATE OR REPLACE FUNCTION public.stripe_customer_refs_test_ok(
  condition boolean,
  message text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS NOT TRUE THEN
    RAISE EXCEPTION 'not ok - %', message;
  END IF;
  RAISE NOTICE 'ok - %', message;
END;
$$;

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

DO $$
DECLARE
  org_a uuid := '11111111-1111-4111-8111-111111111111';
  org_b uuid := '22222222-2222-4222-8222-222222222222';
  org_c uuid := '33333333-3333-4333-8333-333333333333';
  admin_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  member_a uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  admin_b uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  personal uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  seen_count integer;
  write_error text;
BEGIN
  PERFORM public.stripe_customer_refs_put_user(admin_a, 'buyer@example.test');
  PERFORM public.stripe_customer_refs_put_user(member_a, 'member@example.test');
  PERFORM public.stripe_customer_refs_put_user(admin_b, 'buyer@example.test');
  PERFORM public.stripe_customer_refs_put_user(personal, 'personal@example.test');

  INSERT INTO public.organizations (id, name, slug)
  VALUES
    (org_a, 'Org A', 'org-a-stripe-customer-refs'),
    (org_b, 'Org B', 'org-b-stripe-customer-refs'),
    (org_c, 'Org C', 'org-c-stripe-customer-refs')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES
    (org_a, admin_a, 'admin'),
    (org_a, member_a, 'member'),
    (org_b, admin_b, 'admin')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO public.org_stripe_customers (organization_id, stripe_customer_id)
  VALUES
    (org_a, 'cus_test_org_a'),
    (org_b, 'cus_test_org_b');

  INSERT INTO public.user_stripe_customers (user_id, stripe_customer_id)
  VALUES
    (personal, 'cus_test_personal'),
    (admin_a, 'cus_test_admin_a_personal');

  BEGIN
    INSERT INTO public.org_stripe_customers (organization_id, stripe_customer_id)
    VALUES (org_a, 'cus_test_org_a_dup');
    PERFORM public.stripe_customer_refs_test_ok(false, 'org owner unique rejects a second row');
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM public.stripe_customer_refs_test_ok(true, 'org owner unique rejects a second row');
  END;

  BEGIN
    INSERT INTO public.org_stripe_customers (organization_id, stripe_customer_id)
    VALUES (org_c, 'cus_test_org_a');
    PERFORM public.stripe_customer_refs_test_ok(false, 'org stripe_customer_id is unique');
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM public.stripe_customer_refs_test_ok(true, 'org stripe_customer_id is unique');
  END;

  BEGIN
    INSERT INTO public.user_stripe_customers (user_id, stripe_customer_id)
    VALUES (personal, 'cus_test_personal_dup');
    PERFORM public.stripe_customer_refs_test_ok(false, 'user owner unique rejects a second row');
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM public.stripe_customer_refs_test_ok(true, 'user owner unique rejects a second row');
  END;

  PERFORM public.stripe_customer_refs_set_jwt(admin_a);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO seen_count
  FROM public.org_stripe_customers
  WHERE organization_id = org_a;
  PERFORM public.stripe_customer_refs_test_ok(seen_count = 1, 'org admin can read own org customer ref');

  SELECT count(*) INTO seen_count
  FROM public.org_stripe_customers
  WHERE organization_id = org_b;
  PERFORM public.stripe_customer_refs_test_ok(seen_count = 0, 'org admin cannot read another org customer ref');

  EXECUTE 'RESET ROLE';
  PERFORM public.stripe_customer_refs_set_jwt(member_a);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO seen_count
  FROM public.org_stripe_customers
  WHERE organization_id = org_a;
  PERFORM public.stripe_customer_refs_test_ok(seen_count = 0, 'AC4 non-admin cannot read org customer ref');

  EXECUTE 'RESET ROLE';
  PERFORM public.stripe_customer_refs_set_jwt(personal);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO seen_count
  FROM public.user_stripe_customers
  WHERE user_id = personal;
  PERFORM public.stripe_customer_refs_test_ok(seen_count = 1, 'user can read own customer ref');

  SELECT count(*) INTO seen_count
  FROM public.user_stripe_customers
  WHERE user_id = admin_a;
  PERFORM public.stripe_customer_refs_test_ok(seen_count = 0, 'user cannot read another user customer ref');

  write_error := NULL;
  BEGIN
    INSERT INTO public.org_stripe_customers (organization_id, stripe_customer_id)
    VALUES (org_c, 'cus_test_should_fail');
  EXCEPTION
    WHEN OTHERS THEN
      write_error := SQLERRM;
  END;
  PERFORM public.stripe_customer_refs_test_ok(write_error IS NOT NULL, 'authenticated cannot insert org customer ref');

  write_error := NULL;
  BEGIN
    UPDATE public.org_stripe_customers
    SET stripe_customer_id = 'cus_test_updated'
    WHERE organization_id = org_a;
    IF NOT FOUND THEN
      write_error := '0 rows';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      write_error := SQLERRM;
  END;
  PERFORM public.stripe_customer_refs_test_ok(write_error IS NOT NULL, 'authenticated cannot update org customer ref');

  write_error := NULL;
  BEGIN
    DELETE FROM public.org_stripe_customers WHERE organization_id = org_a;
    IF NOT FOUND THEN
      write_error := '0 rows';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      write_error := SQLERRM;
  END;
  PERFORM public.stripe_customer_refs_test_ok(write_error IS NOT NULL, 'authenticated cannot delete org customer ref');

  write_error := NULL;
  BEGIN
    INSERT INTO public.user_stripe_customers (user_id, stripe_customer_id)
    VALUES (member_a, 'cus_test_user_should_fail');
  EXCEPTION
    WHEN OTHERS THEN
      write_error := SQLERRM;
  END;
  PERFORM public.stripe_customer_refs_test_ok(write_error IS NOT NULL, 'authenticated cannot insert user customer ref');

  EXECUTE 'RESET ROLE';
  SELECT count(*) INTO seen_count
  FROM public.org_stripe_customers
  WHERE organization_id = org_a AND stripe_customer_id = 'cus_test_org_a';
  PERFORM public.stripe_customer_refs_test_ok(seen_count = 1, 'org customer ref unchanged after denied writes');

  PERFORM public.stripe_customer_refs_test_ok(true, 'plan finished');
END;
$$;

DROP FUNCTION public.stripe_customer_refs_set_jwt(uuid);
DROP FUNCTION public.stripe_customer_refs_put_user(uuid, text);
DROP FUNCTION public.stripe_customer_refs_test_ok(boolean, text);
