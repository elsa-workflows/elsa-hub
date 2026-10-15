-- Claim RPC, team attach, redemption seat math, and mapped-course access.

CREATE TEMP TABLE academy_claim_test_result (
  name text PRIMARY KEY,
  passed boolean NOT NULL,
  detail text
);

CREATE OR REPLACE FUNCTION pg_temp.claim_ok(p_passed boolean, p_name text, p_detail text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO academy_claim_test_result (name, passed, detail)
  VALUES (p_name, COALESCE(p_passed, false), p_detail)
  ON CONFLICT (name) DO UPDATE
  SET passed = EXCLUDED.passed, detail = EXCLUDED.detail;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.set_claim_jwt(p_user_id uuid, p_email text)
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
      json_build_object(
        'sub', p_user_id,
        'role', 'authenticated',
        'email', p_email
      )::text,
      false
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.clear_claim_jwt()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', false);
  PERFORM set_config('request.jwt.claims', '', false);
END;
$$;

GRANT ALL ON academy_claim_test_result TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.claim_ok(boolean, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.set_claim_jwt(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.clear_claim_jwt() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-000000000011', 'unconfirmed@example.com', NULL),
  ('00000000-0000-4000-8000-000000000012', 'confirmed@example.com', now()),
  ('00000000-0000-4000-8000-000000000013', 'other@example.com', now()),
  ('00000000-0000-4000-8000-000000000014', 'existing@example.com', now()),
  ('00000000-0000-4000-8000-000000000015', 'team-buyer@example.com', now()),
  ('00000000-0000-4000-8000-000000000016', 'team-member@example.com', now()),
  ('00000000-0000-4000-8000-000000000017', 'team-orphan@example.com', now()),
  ('00000000-0000-4000-8000-000000000018', 'colleague1@example.com', now()),
  ('00000000-0000-4000-8000-000000000019', 'colleague2@example.com', now()),
  ('00000000-0000-4000-8000-00000000001a', 'colleague3@example.com', now()),
  ('00000000-0000-4000-8000-00000000001b', 'colleague4@example.com', now()),
  ('00000000-0000-4000-8000-00000000001c', 'team-full@example.com', now()),
  ('00000000-0000-4000-8000-00000000001d', 'Mixed.Case@Example.com', now()),
  ('00000000-0000-4000-8000-00000000001e', 'Unconfirmed.Buyer@Example.com', NULL);

INSERT INTO public.organizations (id, name, slug) VALUES
  ('00000000-0000-4000-8000-000000001101', 'Buyer Org', 'buyer-org'),
  ('00000000-0000-4000-8000-000000001102', 'Other Org', 'other-org');

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000015', 'admin'),
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000016', 'member'),
  ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-00000000001c', 'admin');

INSERT INTO public.academy_courses (
  id, slug, title, summary, sort_order, is_published, price_cents, currency,
  product_code, product_codes
) VALUES (
  '00000000-0000-4000-8000-000000002101',
  'other-published-course',
  'Other Published Course',
  'Not on the Gumroad bundle SKU list',
  3,
  true,
  4900,
  'eur',
  'other_sku',
  ARRAY['other_sku']
);

INSERT INTO public.academy_lessons (
  id, course_id, slug, title, sort_order, body_md, is_preview, duration_minutes
) VALUES (
  '00000000-0000-4000-8000-000000003201',
  '00000000-0000-4000-8000-000000002101',
  'other-paid',
  'Other Paid Lesson',
  1,
  'OTHER PAID BODY',
  false,
  12
);

INSERT INTO public.academy_pending_grants (
  email, product_code, seats, kind, gumroad_sale_id, counts_against_sale_id, organization_name_hint
) VALUES
  ('unconfirmed@example.com', 'solo_bundle', 1, 'solo', 'sale_unconfirmed', NULL, NULL),
  ('confirmed@example.com', 'solo_bundle', 1, 'solo', 'sale_confirmed', NULL, NULL),
  ('missing@example.com', 'solo_bundle', 1, 'solo', 'sale_missing_user', NULL, NULL),
  ('team-buyer@example.com', 'team_5', 5, 'team', 'sale_team_zero', NULL, 'Buyer Org'),
  ('team-orphan@example.com', 'team_5', 5, 'team', 'sale_team_orphan', NULL, NULL),
  ('team-full@example.com', 'team_5', 5, 'team', 'sale_team_full', NULL, NULL),
  ('colleague1@example.com', 'solo_bundle', 1, 'redemption', 'sale_red_1', 'sale_team_full', NULL),
  ('colleague2@example.com', 'solo_bundle', 1, 'redemption', 'sale_red_2', 'sale_team_full', NULL),
  ('colleague3@example.com', 'solo_bundle', 1, 'redemption', 'sale_red_3', 'sale_team_full', NULL),
  ('colleague4@example.com', 'solo_bundle', 1, 'redemption', 'sale_red_4', 'sale_team_full', NULL),
  ('colleague1@example.com', 'solo_bundle', 1, 'redemption', 'sale_red_unmapped', NULL, NULL);

-- ---------------------------------------------------------------------------
-- Unconfirmed email gets nothing
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000011',
  'unconfirmed@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'personal_claimed')::integer = 0,
  'unconfirmed email claim returns 0'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_unconfirmed'
  ),
  'unconfirmed email creates no entitlement'
);

INSERT INTO public.academy_pending_grants (
  email, product_code, seats, kind, gumroad_sale_id
) VALUES (
  'unconfirmed@example.com', 'team_5', 5, 'team', 'sale_unconfirmed_team'
);

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000011',
  'unconfirmed@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_team_grant('00000000-0000-4000-8000-000000001101') ->> 'status')
    = 'unconfirmed',
  'unconfirmed email team claim returns unconfirmed'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_unconfirmed_team'
  ),
  'unconfirmed email team claim creates no entitlement'
);

-- ---------------------------------------------------------------------------
-- Confirmed solo match: grant + access only to mapped courses
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000012',
  'confirmed@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'personal_claimed')::integer = 1,
  'confirmed email claim returns 1'
);

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'personal_claimed')::integer = 0,
  'second personal claim returns 0'
);

SELECT pg_temp.claim_ok(
  public.has_academy_access('00000000-0000-4000-8000-000000002001'),
  'claimed solo grant accesses mapped bundle course'
);

SELECT pg_temp.claim_ok(
  NOT public.has_academy_access('00000000-0000-4000-8000-000000002101'),
  'claimed solo grant does not access unmapped course'
);

SELECT pg_temp.claim_ok(
  (
    SELECT body_md FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003002'
  ) = 'PAID BODY',
  'claimed solo grant reads mapped paid body'
);

SELECT pg_temp.claim_ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_lessons
    WHERE id = '00000000-0000-4000-8000-000000003201'
  ),
  'claimed solo grant cannot read unmapped paid body'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_confirmed'
      AND subject_type = 'user'
      AND product_code = 'solo_bundle'
      AND user_id = '00000000-0000-4000-8000-000000000012'
  ),
  'confirmed solo entitlement uses solo_bundle'
);

-- Mixed-case JWT / auth.users email matches a lower-case pending row.
INSERT INTO public.academy_pending_grants (
  email, product_code, seats, kind, gumroad_sale_id
) VALUES (
  'mixed.case@example.com', 'solo_bundle', 1, 'solo', 'sale_mixed_claim'
);

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-00000000001d',
  'Mixed.Case@Example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'personal_claimed')::integer = 1,
  'mixed-case email claim matches the normalized buyer email'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_mixed_claim'
      AND user_id = '00000000-0000-4000-8000-00000000001d'
  ),
  'mixed-case email claim creates the personal entitlement'
);

-- ---------------------------------------------------------------------------
-- Another user's email gets nothing
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000013',
  'other@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'personal_claimed')::integer = 0
  AND (public.academy_claim_pending_grants() ->> 'team_status') = 'none',
  'other user email claim returns 0'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

-- ---------------------------------------------------------------------------
-- Team: needs_organization when the caller has no admin org
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000017',
  'team-orphan@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'team_status') = 'needs_organization',
  'personal claim reports needs_organization for a team buyer without an org'
);

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_team_grant(NULL) ->> 'status') = 'needs_organization',
  'team claim without an org returns needs_organization'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_orphan'
  ),
  'needs_organization does not create an entitlement'
);

-- ---------------------------------------------------------------------------
-- Team: non-admin org is refused
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000016',
  'team-member@example.com'
);
SET ROLE authenticated;

-- Member has no team pending of their own; still refuse attach to an org they do not admin
-- Use the buyer email mismatch: this user is not the pending buyer.
-- Seed a team pending for the member so the refusal path is reached.
RESET ROLE;
INSERT INTO public.academy_pending_grants (
  email, product_code, seats, kind, gumroad_sale_id
) VALUES (
  'team-member@example.com', 'team_5', 5, 'team', 'sale_team_member'
);

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000016',
  'team-member@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (
    public.academy_claim_pending_team_grant('00000000-0000-4000-8000-000000001101')
    ->> 'status'
  ) = 'not_authorized',
  'team claim to a non-admin org returns not_authorized'
);

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_member'
  ),
  'non-admin org claim creates no entitlement'
);

-- ---------------------------------------------------------------------------
-- Team: admin org attach, 0 redemptions = 5 seats, double claim
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000015',
  'team-buyer@example.com'
);
SET ROLE authenticated;

SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'team_status') = 'ready',
  'personal claim reports ready when the team buyer is an org admin'
);

DO $$
DECLARE
  v_first jsonb;
  v_second jsonb;
BEGIN
  v_first := public.academy_claim_pending_team_grant('00000000-0000-4000-8000-000000001101');
  v_second := public.academy_claim_pending_team_grant('00000000-0000-4000-8000-000000001101');
  PERFORM pg_temp.claim_ok(
    (v_first ->> 'status') = 'granted',
    'team claim to an admin org grants'
  );
  PERFORM pg_temp.claim_ok(
    (v_second ->> 'status') = 'already_claimed',
    'team claim double call is already_claimed'
  );
END
$$;

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_zero'
      AND subject_type = 'org'
      AND organization_id = '00000000-0000-4000-8000-000000001101'
      AND user_id IS NULL
      AND product_code = 'team_5'
      AND seats = 5
      AND gumroad_redemption_count = 0
  ),
  'team pack with 0 redemptions keeps 5 assignable seats'
);

-- ---------------------------------------------------------------------------
-- Team 5 with 4 linked redemptions = 1 assignable seat + 4 individual grants
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000018',
  'colleague1@example.com'
);
SET ROLE authenticated;
SELECT pg_temp.claim_ok(
  (public.academy_claim_pending_grants() ->> 'personal_claimed')::integer = 2,
  'colleague claims linked and unmapped redemptions as personal grants'
);
RESET ROLE;

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000019',
  'colleague2@example.com'
);
SET ROLE authenticated;
SELECT public.academy_claim_pending_grants();
RESET ROLE;

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-00000000001a',
  'colleague3@example.com'
);
SET ROLE authenticated;
SELECT public.academy_claim_pending_grants();
RESET ROLE;

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-00000000001b',
  'colleague4@example.com'
);
SET ROLE authenticated;
SELECT public.academy_claim_pending_grants();
RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-00000000001c',
  'team-full@example.com'
);
SET ROLE authenticated;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.academy_claim_pending_team_grant('00000000-0000-4000-8000-000000001102');
  PERFORM pg_temp.claim_ok(
    (v_result ->> 'status') = 'granted'
    AND (v_result ->> 'seats')::integer = 1
    AND (v_result ->> 'redemption_count')::integer = 4,
    'team 5 with 4 linked redemptions grants 1 seat'
  );
END
$$;

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

SELECT pg_temp.claim_ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_full'
      AND subject_type = 'org'
      AND seats = 1
      AND gumroad_redemption_count = 4
      AND product_code = 'team_5'
  ),
  'org entitlement records 4 linked redemptions and 1 remaining seat'
);

SELECT pg_temp.claim_ok(
  (
    SELECT COUNT(*) FROM public.academy_entitlements
    WHERE source = 'gumroad_migration'
      AND subject_type = 'user'
      AND product_code = 'solo_bundle'
      AND gumroad_sale_id IN ('sale_red_1', 'sale_red_2', 'sale_red_3', 'sale_red_4')
  ) = 4,
  'four linked redemptions are individual solo_bundle grants'
);

SELECT pg_temp.claim_ok(
  (
    SELECT COUNT(*) FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_full'
  ) = 1
  AND (
    SELECT seats FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_full'
  ) = 1,
  're-evaluating linked redemptions does not double-decrement seats'
);

SELECT pg_temp.claim_ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_red_unmapped'
      AND subject_type = 'user'
  )
  AND (
    SELECT gumroad_redemption_count FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_team_full'
  ) = 4,
  'unmapped redemption is granted and not charged to the team pack'
);

-- ---------------------------------------------------------------------------
-- Grant RPC: existing user solo, missing user pending, team stays pending, rerun
-- ---------------------------------------------------------------------------

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'Unconfirmed.Buyer@Example.com', 'solo_bundle', 1, 'sale_unconf_import', NULL, NULL, 'solo', false
  ) = 'pending',
  'grant rpc leaves an unconfirmed existing user pending'
);

SELECT pg_temp.claim_ok(
  NOT EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_unconf_import'
  )
  AND EXISTS (
    SELECT 1 FROM public.academy_pending_grants
    WHERE gumroad_sale_id = 'sale_unconf_import'
      AND claimed_at IS NULL
      AND email = 'unconfirmed.buyer@example.com'
  ),
  'grant rpc does not attach a solo grant to an unconfirmed account'
);

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'MIXED.CASE@EXAMPLE.COM', 'solo_bundle', 1, 'sale_mixed_grant', NULL, NULL, 'solo', false
  ) = 'granted',
  'grant rpc matches a mixed-case confirmed email'
);

SELECT pg_temp.claim_ok(
  EXISTS (
    SELECT 1 FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_mixed_grant'
      AND user_id = '00000000-0000-4000-8000-00000000001d'
      AND product_code = 'solo_bundle'
  ),
  'grant rpc mixed-case match attaches the personal entitlement'
);

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'existing@example.com', 'solo_bundle', 1, 'sale_exist_1', NULL, NULL, 'solo', false
  ) = 'granted',
  'grant rpc grants immediately when a solo user exists'
);

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'existing@example.com', 'solo_bundle', 1, 'sale_exist_1', NULL, NULL, 'solo', false
  ) = 'already_granted',
  'grant rpc solo rerun is already_granted'
);

SELECT pg_temp.claim_ok(
  (
    SELECT COUNT(*) FROM public.academy_entitlements
    WHERE gumroad_sale_id = 'sale_exist_1'
  ) = 1,
  'grant rpc rerun inserts nothing twice'
);

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'nobody@example.com', 'solo_bundle', 1, 'sale_pend_1', NULL, NULL, 'solo', false
  ) = 'pending',
  'grant rpc inserts pending when the user is missing'
);

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'nobody@example.com', 'solo_bundle', 1, 'sale_pend_1', NULL, NULL, 'solo', false
  ) = 'already_pending',
  'grant rpc pending rerun is already_pending'
);

DO $$
DECLARE
  v_result text;
BEGIN
  v_result := public.academy_grant_gumroad_sale(
    'existing@example.com', 'team_5', 5, 'sale_exist_team', 'Example Org', NULL, 'team', false
  );
  PERFORM pg_temp.claim_ok(
    v_result = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM public.academy_entitlements
      WHERE gumroad_sale_id = 'sale_exist_team'
    )
    AND EXISTS (
      SELECT 1 FROM public.academy_pending_grants
      WHERE gumroad_sale_id = 'sale_exist_team'
        AND kind = 'team'
        AND claimed_at IS NULL
    ),
    'grant rpc never auto-creates an org for a team sale'
  );
END
$$;

SELECT pg_temp.claim_ok(
  public.academy_grant_gumroad_sale(
    'colleague1@example.com', 'solo_bundle', 1, 'sale_red_1', NULL, 'sale_team_full', 'redemption', false
  ) = 'already_granted',
  'grant rpc redemption rerun does not double-decrement'
);

DO $$
DECLARE
  v_result text;
BEGIN
  v_result := public.academy_grant_gumroad_sale(
    'existing@example.com', 'solo_bundle', 1, 'sale_dry_1', NULL, NULL, 'solo', true
  );
  PERFORM pg_temp.claim_ok(
    v_result = 'granted'
    AND NOT EXISTS (
      SELECT 1 FROM public.academy_entitlements
      WHERE gumroad_sale_id = 'sale_dry_1'
    ),
    'grant rpc dry-run does not write'
  );
END
$$;

DO $$
DECLARE
  v_result text;
BEGIN
  v_result := public.academy_grant_gumroad_sale(
    'existing@example.com',
    'solo_bundle',
    1,
    'sale_bad_parent',
    NULL,
    'sale_does_not_exist',
    'redemption',
    false
  );
  PERFORM pg_temp.claim_ok(
    v_result = 'granted'
    AND EXISTS (
      SELECT 1 FROM public.academy_pending_grants
      WHERE gumroad_sale_id = 'sale_bad_parent'
        AND counts_against_sale_id IS NULL
        AND kind = 'redemption'
    ),
    'grant rpc treats a missing parent sale as unmapped'
  );
END
$$;

DO $$
DECLARE
  v_result text;
BEGIN
  v_result := public.academy_grant_gumroad_sale(
    'existing@example.com',
    'solo_bundle',
    1,
    'sale_late_red',
    NULL,
    'sale_team_zero',
    'redemption',
    false
  );
  PERFORM pg_temp.claim_ok(
    v_result = 'linked_after_claim'
    AND EXISTS (
      SELECT 1 FROM public.academy_entitlements
      WHERE gumroad_sale_id = 'sale_team_zero'
        AND seats = 4
        AND gumroad_redemption_count = 1
    )
    AND EXISTS (
      SELECT 1 FROM public.academy_entitlements
      WHERE gumroad_sale_id = 'sale_late_red'
        AND subject_type = 'user'
        AND product_code = 'solo_bundle'
    ),
    'late redemption after team claim recomputes seats'
  );
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.academy_entitlements (
      product_code, subject_type, user_id, seats, source
    ) VALUES (
      'solo_bundle',
      'user',
      '00000000-0000-4000-8000-000000000012',
      0,
      'stripe'
    );
    PERFORM pg_temp.claim_ok(false, 'stripe seats=0 is rejected');
  EXCEPTION
    WHEN check_violation THEN
      PERFORM pg_temp.claim_ok(true, 'stripe seats=0 is rejected');
  END;
END
$$;

DO $$
BEGIN
  INSERT INTO public.academy_entitlements (
    product_code,
    subject_type,
    organization_id,
    seats,
    source,
    gumroad_sale_id
  ) VALUES (
    'team_5',
    'org',
    '00000000-0000-4000-8000-000000001101',
    0,
    'gumroad_migration',
    'sale_zero_seat_constraint'
  );
  PERFORM pg_temp.claim_ok(
    EXISTS (
      SELECT 1 FROM public.academy_entitlements
      WHERE gumroad_sale_id = 'sale_zero_seat_constraint'
        AND seats = 0
        AND subject_type = 'org'
        AND source = 'gumroad_migration'
    ),
    'org gumroad_migration seats=0 is allowed'
  );
END
$$;

-- ---------------------------------------------------------------------------
-- Authenticated cannot read pending or execute the grant RPC
-- ---------------------------------------------------------------------------

SELECT pg_temp.set_claim_jwt(
  '00000000-0000-4000-8000-000000000012',
  'confirmed@example.com'
);
SET ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.academy_pending_grants;
    PERFORM pg_temp.claim_ok(false, 'authenticated cannot select pending grants');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.claim_ok(true, 'authenticated cannot select pending grants');
  END;
END
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.academy_grant_gumroad_sale(
      'confirmed@example.com', 'solo_bundle', 1, 'sale_auth_denied', NULL, NULL, 'solo', false
    );
    PERFORM pg_temp.claim_ok(false, 'authenticated cannot execute grant rpc');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM pg_temp.claim_ok(true, 'authenticated cannot execute grant rpc');
  END;
END
$$;

RESET ROLE;
SELECT pg_temp.clear_claim_jwt();

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------

\echo
\echo '=== academy claim results ==='
SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  name,
  COALESCE(detail, '') AS detail
FROM academy_claim_test_result
ORDER BY passed ASC, name;

\echo
SELECT
  COUNT(*) FILTER (WHERE passed) AS passed,
  COUNT(*) FILTER (WHERE NOT passed) AS failed,
  COUNT(*) AS total
FROM academy_claim_test_result;

DO $$
DECLARE
  v_failed integer;
BEGIN
  SELECT COUNT(*) INTO v_failed FROM academy_claim_test_result WHERE NOT passed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION '% academy claim assertion(s) failed', v_failed;
  END IF;
END
$$;
