-- Gumroad buyer migration. Applies after the R2 academy schema.
-- No auth trigger. Never creates organizations or memberships.

-- ---------------------------------------------------------------------------
-- Idempotent migrated entitlements
-- ---------------------------------------------------------------------------

ALTER TABLE public.academy_entitlements
  ADD COLUMN gumroad_sale_id text;

ALTER TABLE public.academy_entitlements
  ADD COLUMN gumroad_redemption_count integer;

ALTER TABLE public.academy_entitlements
  ADD CONSTRAINT academy_entitlements_gumroad_sale_id_key
  UNIQUE (gumroad_sale_id);

ALTER TABLE public.academy_entitlements
  ADD CONSTRAINT academy_entitlements_gumroad_redemption_count_check
  CHECK (
    gumroad_redemption_count IS NULL
    OR gumroad_redemption_count >= 0
  );

ALTER TABLE public.academy_entitlements
  DROP CONSTRAINT academy_entitlements_seats_check;

ALTER TABLE public.academy_entitlements
  ADD CONSTRAINT academy_entitlements_seats_check
  CHECK (
    seats > 0
    OR (
      seats >= 0
      AND subject_type = 'org'
      AND source = 'gumroad_migration'
    )
  );

COMMENT ON COLUMN public.academy_entitlements.gumroad_sale_id IS
  'Gumroad sale id for source = gumroad_migration. UNIQUE so a rerun inserts nothing twice. NULL for Stripe and manual grants.';

COMMENT ON COLUMN public.academy_entitlements.gumroad_redemption_count IS
  'Linked 100%-off redemptions charged against a Team pack when this org entitlement was claimed. Remaining seats are pack size minus this count.';

-- ---------------------------------------------------------------------------
-- Pending grants
-- ---------------------------------------------------------------------------

CREATE TABLE public.academy_pending_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product_code text NOT NULL,
  seats integer NOT NULL,
  kind text NOT NULL,
  gumroad_sale_id text NOT NULL,
  counts_against_sale_id text,
  organization_name_hint text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  claimed_entitlement_id uuid REFERENCES public.academy_entitlements(id) ON DELETE RESTRICT,
  CONSTRAINT academy_pending_grants_email_check
    CHECK (
      email = lower(email)
      AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
  CONSTRAINT academy_pending_grants_product_code_check
    CHECK (product_code ~ '^[a-z0-9_]+$'),
  CONSTRAINT academy_pending_grants_seats_check
    CHECK (seats > 0),
  CONSTRAINT academy_pending_grants_kind_check
    CHECK (kind IN ('solo', 'team', 'redemption')),
  CONSTRAINT academy_pending_grants_gumroad_sale_id_key
    UNIQUE (gumroad_sale_id),
  CONSTRAINT academy_pending_grants_organization_name_hint_check
    CHECK (
      organization_name_hint IS NULL
      OR char_length(organization_name_hint) BETWEEN 1 AND 200
    ),
  CONSTRAINT academy_pending_grants_claimed_pair_check
    CHECK (
      (claimed_at IS NULL AND claimed_entitlement_id IS NULL)
      OR (claimed_at IS NOT NULL AND claimed_entitlement_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.academy_pending_grants IS
  'Gumroad grants waiting to be claimed. Email is lower-case. Solo and redemption rows become personal entitlements. Team rows attach to an org the buyer already administers. RLS is on and there is no client policy. Never creates an organization. Claimed rows keep the buyer email for the migration window; hash or null it after the window closes.';

COMMENT ON COLUMN public.academy_pending_grants.counts_against_sale_id IS
  'Buyer gumroad_sale_id that a 100%-off redemption is charged against. Set only when that id is an existing kind=team row. NULL means unmapped: the row is not charged to any Team pack.';

CREATE INDEX academy_pending_grants_unclaimed_email_idx
  ON public.academy_pending_grants (email)
  WHERE claimed_at IS NULL;

CREATE INDEX academy_pending_grants_counts_against_sale_id_idx
  ON public.academy_pending_grants (counts_against_sale_id)
  WHERE counts_against_sale_id IS NOT NULL;

ALTER TABLE public.academy_pending_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.academy_pending_grants FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.academy_pending_grants TO service_role;

-- ---------------------------------------------------------------------------
-- Shared helpers: confirmed email on every attach path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.academy_normalized_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT lower(btrim(COALESCE(p_email, '')));
$$;

REVOKE ALL ON FUNCTION public.academy_normalized_email(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_user_email_is_confirmed_match(
  p_user_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS users
    WHERE users.id = p_user_id
      AND users.email_confirmed_at IS NOT NULL
      AND public.academy_normalized_email(users.email)
        = public.academy_normalized_email(p_email)
      AND public.academy_normalized_email(p_email) <> ''
  );
$$;

COMMENT ON FUNCTION public.academy_user_email_is_confirmed_match(uuid, text) IS
  'True only when auth.users.email_confirmed_at is set and lower(trim(email)) equals the normalized buyer email. Does not read the project Confirm email setting.';

REVOKE ALL ON FUNCTION public.academy_user_email_is_confirmed_match(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_confirmed_user_id_for_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_count integer;
  v_id uuid;
BEGIN
  v_email := public.academy_normalized_email(p_email);
  IF v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM auth.users AS users
  WHERE users.email_confirmed_at IS NOT NULL
    AND public.academy_normalized_email(users.email) = v_email;

  IF v_count <> 1 THEN
    RETURN NULL;
  END IF;

  SELECT users.id
  INTO v_id
  FROM auth.users AS users
  WHERE users.email_confirmed_at IS NOT NULL
    AND public.academy_normalized_email(users.email) = v_email;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.academy_confirmed_user_id_for_email(text) IS
  'Returns the auth.users id when exactly one confirmed row matches lower(trim(email)). Unconfirmed or ambiguous matches return NULL so the grant stays pending.';

REVOKE ALL ON FUNCTION public.academy_confirmed_user_id_for_email(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_confirmed_claim_email()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_jwt_email text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_jwt_email := public.academy_normalized_email(auth.jwt() ->> 'email');
  IF v_jwt_email = '' THEN
    RETURN NULL;
  END IF;

  IF NOT public.academy_user_email_is_confirmed_match(v_user_id, v_jwt_email) THEN
    RETURN NULL;
  END IF;

  RETURN v_jwt_email;
END;
$$;

COMMENT ON FUNCTION public.academy_confirmed_claim_email() IS
  'Internal. Returns the normalized JWT email when auth.users.email_confirmed_at is set and lower(trim(email)) matches. Otherwise NULL.';

REVOKE ALL ON FUNCTION public.academy_confirmed_claim_email() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_insert_migrated_entitlement(
  p_subject_type text,
  p_user_id uuid,
  p_organization_id uuid,
  p_product_code text,
  p_seats integer,
  p_gumroad_sale_id text,
  p_redemption_count integer DEFAULT NULL,
  p_buyer_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_subject_type = 'user' THEN
    IF p_user_id IS NULL
      OR NOT public.academy_user_email_is_confirmed_match(p_user_id, p_buyer_email)
    THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.academy_entitlements (
    course_id,
    product_code,
    subject_type,
    user_id,
    organization_id,
    seats,
    source,
    gumroad_sale_id,
    gumroad_redemption_count
  ) VALUES (
    NULL,
    p_product_code,
    p_subject_type,
    p_user_id,
    p_organization_id,
    p_seats,
    'gumroad_migration',
    p_gumroad_sale_id,
    p_redemption_count
  )
  ON CONFLICT (gumroad_sale_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT entitlement.id
    INTO v_id
    FROM public.academy_entitlements AS entitlement
    WHERE entitlement.gumroad_sale_id = p_gumroad_sale_id
      AND (
        (p_subject_type = 'user' AND entitlement.user_id = p_user_id)
        OR (p_subject_type = 'org' AND entitlement.organization_id = p_organization_id)
      );
  END IF;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.academy_insert_migrated_entitlement(text, uuid, uuid, text, integer, text, integer, text) IS
  'Internal helper. Inserts a gumroad_migration entitlement. A personal grant attaches only when the user is confirmed and lower(trim(email)) matches the buyer email. ON CONFLICT (gumroad_sale_id) DO NOTHING.';

REVOKE ALL ON FUNCTION public.academy_insert_migrated_entitlement(text, uuid, uuid, text, integer, text, integer, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_linked_redemption_count(p_sale_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::integer
  FROM public.academy_pending_grants AS pending
  WHERE pending.counts_against_sale_id = p_sale_id;
$$;

REVOKE ALL ON FUNCTION public.academy_linked_redemption_count(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_team_parent_sale(p_sale_id text)
RETURNS public.academy_pending_grants
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pending.*
  FROM public.academy_pending_grants AS pending
  WHERE pending.gumroad_sale_id = p_sale_id
    AND pending.kind = 'team';
$$;

REVOKE ALL ON FUNCTION public.academy_team_parent_sale(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_recompute_team_pack_seats(p_sale_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pack integer;
  v_linked integer;
  v_assigned integer;
  v_seats integer;
  v_entitlement_id uuid;
BEGIN
  SELECT pending.seats
  INTO v_pack
  FROM public.academy_pending_grants AS pending
  WHERE pending.gumroad_sale_id = p_sale_id
    AND pending.kind = 'team';

  IF v_pack IS NULL THEN
    RETURN NULL;
  END IF;

  v_linked := public.academy_linked_redemption_count(p_sale_id);

  SELECT entitlement.id
  INTO v_entitlement_id
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.gumroad_sale_id = p_sale_id
    AND entitlement.subject_type = 'org'
    AND entitlement.source = 'gumroad_migration';

  IF v_entitlement_id IS NULL THEN
    RETURN GREATEST(0, v_pack - v_linked);
  END IF;

  SELECT COUNT(*)
  INTO v_assigned
  FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = v_entitlement_id;

  IF v_assigned + v_linked > v_pack THEN
    RETURN NULL;
  END IF;

  v_seats := GREATEST(0, v_pack - v_linked);

  UPDATE public.academy_entitlements AS entitlement
  SET
    seats = v_seats,
    gumroad_redemption_count = v_linked
  WHERE entitlement.id = v_entitlement_id;

  RETURN v_seats;
END;
$$;

COMMENT ON FUNCTION public.academy_recompute_team_pack_seats(text) IS
  'Sets org gumroad_migration seats to pack size minus linked redemptions. Returns NULL when assigned seats plus linked redemptions would exceed the pack.';

REVOKE ALL ON FUNCTION public.academy_recompute_team_pack_seats(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_can_link_redemption(p_sale_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pack integer;
  v_linked integer;
  v_assigned integer;
  v_entitlement_id uuid;
BEGIN
  SELECT pending.seats
  INTO v_pack
  FROM public.academy_pending_grants AS pending
  WHERE pending.gumroad_sale_id = p_sale_id
    AND pending.kind = 'team';

  IF v_pack IS NULL THEN
    RETURN false;
  END IF;

  v_linked := public.academy_linked_redemption_count(p_sale_id);

  SELECT entitlement.id
  INTO v_entitlement_id
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.gumroad_sale_id = p_sale_id
    AND entitlement.subject_type = 'org'
    AND entitlement.source = 'gumroad_migration';

  IF v_entitlement_id IS NULL THEN
    RETURN (v_linked + 1) <= v_pack;
  END IF;

  SELECT COUNT(*)
  INTO v_assigned
  FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = v_entitlement_id;

  RETURN (v_assigned + v_linked + 1) <= v_pack;
END;
$$;

REVOKE ALL ON FUNCTION public.academy_can_link_redemption(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- service_role grant path used by scripts/academy-gumroad-migrate.ts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.academy_grant_gumroad_sale(
  p_email text,
  p_product_code text,
  p_seats integer,
  p_gumroad_sale_id text,
  p_organization_name_hint text DEFAULT NULL,
  p_counts_against_sale_id text DEFAULT NULL,
  p_kind text DEFAULT NULL,
  p_dry_run boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_sale_id text;
  v_product_code text;
  v_org_hint text;
  v_counts_against text;
  v_kind text;
  v_user_id uuid;
  v_entitlement_id uuid;
  v_pending public.academy_pending_grants%ROWTYPE;
  v_parent public.academy_pending_grants%ROWTYPE;
  v_parent_claimed boolean := false;
  v_outcome text;
BEGIN
  v_email := public.academy_normalized_email(p_email);
  v_sale_id := btrim(COALESCE(p_gumroad_sale_id, ''));
  v_product_code := btrim(COALESCE(p_product_code, ''));
  v_org_hint := NULLIF(btrim(COALESCE(p_organization_name_hint, '')), '');
  v_counts_against := NULLIF(btrim(COALESCE(p_counts_against_sale_id, '')), '');
  v_kind := NULLIF(btrim(COALESCE(p_kind, '')), '');

  IF v_kind IS NULL THEN
    IF v_counts_against IS NOT NULL THEN
      v_kind := 'redemption';
    ELSIF v_product_code IN ('team_5', 'team_10') THEN
      v_kind := 'team';
    ELSE
      v_kind := 'solo';
    END IF;
  END IF;

  IF v_kind = 'redemption' THEN
    v_product_code := 'solo_bundle';
  ELSIF v_kind = 'solo' THEN
    v_product_code := 'solo_bundle';
  END IF;

  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  IF v_sale_id = '' THEN
    RAISE EXCEPTION 'gumroad_sale_id is required';
  END IF;

  IF v_product_code !~ '^[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'invalid product_code';
  END IF;

  IF v_kind NOT IN ('solo', 'team', 'redemption') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  IF p_seats IS NULL OR p_seats <= 0 THEN
    RAISE EXCEPTION 'seats must be positive';
  END IF;

  IF v_kind = 'redemption' AND v_counts_against IS NOT NULL THEN
    SELECT parent.*
    INTO v_parent
    FROM public.academy_pending_grants AS parent
    WHERE parent.gumroad_sale_id = v_counts_against
      AND parent.kind = 'team';

    IF v_parent.id IS NULL OR NOT public.academy_can_link_redemption(v_counts_against) THEN
      v_counts_against := NULL;
    ELSE
      v_parent_claimed := v_parent.claimed_at IS NOT NULL;
    END IF;
  END IF;

  SELECT entitlement.id
  INTO v_entitlement_id
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.gumroad_sale_id = v_sale_id;

  SELECT pending.*
  INTO v_pending
  FROM public.academy_pending_grants AS pending
  WHERE pending.gumroad_sale_id = v_sale_id;

  IF v_entitlement_id IS NOT NULL THEN
    RETURN 'already_granted';
  END IF;

  IF v_pending.id IS NOT NULL AND v_pending.claimed_at IS NOT NULL THEN
    RETURN 'already_granted';
  END IF;

  IF v_pending.id IS NOT NULL AND v_pending.claimed_at IS NULL THEN
    RETURN 'already_pending';
  END IF;

  -- Confirmed match only. Unconfirmed or ambiguous emails stay pending.
  v_user_id := public.academy_confirmed_user_id_for_email(v_email);

  -- Team packs stay pending. The buyer creates an org in Hub, then claims.
  IF v_kind = 'team' THEN
    IF p_dry_run THEN
      RETURN 'pending';
    END IF;

    INSERT INTO public.academy_pending_grants (
      email,
      product_code,
      seats,
      kind,
      gumroad_sale_id,
      organization_name_hint
    ) VALUES (
      v_email,
      v_product_code,
      p_seats,
      'team',
      v_sale_id,
      v_org_hint
    )
    ON CONFLICT (gumroad_sale_id) DO NOTHING;

    RETURN 'pending';
  END IF;

  IF v_user_id IS NOT NULL THEN
    IF p_dry_run THEN
      IF v_kind = 'redemption' AND v_parent_claimed THEN
        RETURN 'linked_after_claim';
      END IF;
      RETURN 'granted';
    END IF;

    v_entitlement_id := public.academy_insert_migrated_entitlement(
      'user',
      v_user_id,
      NULL,
      'solo_bundle',
      1,
      v_sale_id,
      NULL,
      v_email
    );

    IF v_entitlement_id IS NULL THEN
      RETURN 'already_granted';
    END IF;

    INSERT INTO public.academy_pending_grants (
      email,
      product_code,
      seats,
      kind,
      gumroad_sale_id,
      counts_against_sale_id,
      organization_name_hint,
      claimed_at,
      claimed_entitlement_id
    ) VALUES (
      v_email,
      'solo_bundle',
      1,
      v_kind,
      v_sale_id,
      CASE WHEN v_kind = 'redemption' THEN v_counts_against ELSE NULL END,
      v_org_hint,
      now(),
      v_entitlement_id
    )
    ON CONFLICT (gumroad_sale_id) DO NOTHING;

    IF v_kind = 'redemption' AND v_counts_against IS NOT NULL THEN
      PERFORM public.academy_recompute_team_pack_seats(v_counts_against);
      IF v_parent_claimed THEN
        RETURN 'linked_after_claim';
      END IF;
    END IF;

    RETURN 'granted';
  END IF;

  IF p_dry_run THEN
    IF v_kind = 'redemption' AND v_parent_claimed THEN
      RETURN 'linked_after_claim';
    END IF;
    RETURN 'pending';
  END IF;

  INSERT INTO public.academy_pending_grants (
    email,
    product_code,
    seats,
    kind,
    gumroad_sale_id,
    counts_against_sale_id,
    organization_name_hint
  ) VALUES (
    v_email,
    CASE WHEN v_kind = 'redemption' THEN 'solo_bundle' ELSE v_product_code END,
    CASE WHEN v_kind = 'redemption' THEN 1 ELSE p_seats END,
    v_kind,
    v_sale_id,
    CASE WHEN v_kind = 'redemption' THEN v_counts_against ELSE NULL END,
    v_org_hint
  )
  ON CONFLICT (gumroad_sale_id) DO NOTHING;

  IF v_kind = 'redemption' AND v_counts_against IS NOT NULL THEN
    PERFORM public.academy_recompute_team_pack_seats(v_counts_against);
    IF v_parent_claimed THEN
      RETURN 'linked_after_claim';
    END IF;
  END IF;

  RETURN 'pending';
END;
$$;

COMMENT ON FUNCTION public.academy_grant_gumroad_sale(text, text, integer, text, text, text, text, boolean) IS
  'service_role only. Solo and mapped redemptions grant a personal solo_bundle entitlement only when a confirmed Hub user matches lower(trim(email)). Unconfirmed matches stay pending. Team sales always stay pending. A counts_against_sale_id must be an existing kind=team row or it is stored as unmapped. Late redemptions recompute claimed Team seats. Safe to call repeatedly.';

REVOKE ALL ON FUNCTION public.academy_grant_gumroad_sale(text, text, integer, text, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.academy_grant_gumroad_sale(text, text, integer, text, text, text, text, boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- Signed-in claim: solo + redemptions. No auth trigger. No org create.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.academy_claim_pending_grants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_count integer := 0;
  v_pending public.academy_pending_grants%ROWTYPE;
  v_entitlement_id uuid;
  v_team_pending integer := 0;
  v_is_org_admin boolean := false;
  v_team_status text;
BEGIN
  v_email := public.academy_confirmed_claim_email();
  v_user_id := auth.uid();

  IF v_email IS NULL
    OR v_user_id IS NULL
    OR NOT public.academy_user_email_is_confirmed_match(v_user_id, v_email)
  THEN
    RETURN jsonb_build_object(
      'personal_claimed', 0,
      'team_pending', 0,
      'team_status', 'none'
    );
  END IF;

  FOR v_pending IN
    SELECT pending.*
    FROM public.academy_pending_grants AS pending
    WHERE pending.email = v_email
      AND pending.claimed_at IS NULL
      AND pending.kind IN ('solo', 'redemption')
    FOR UPDATE SKIP LOCKED
  LOOP
    IF NOT public.academy_user_email_is_confirmed_match(v_user_id, v_pending.email) THEN
      CONTINUE;
    END IF;

    v_entitlement_id := public.academy_insert_migrated_entitlement(
      'user',
      v_user_id,
      NULL,
      'solo_bundle',
      1,
      v_pending.gumroad_sale_id,
      NULL,
      v_pending.email
    );

    IF v_entitlement_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.academy_pending_grants AS pending
    SET
      claimed_at = now(),
      claimed_entitlement_id = v_entitlement_id
    WHERE pending.id = v_pending.id
      AND pending.claimed_at IS NULL;

    IF FOUND THEN
      v_count := v_count + 1;
      IF v_pending.counts_against_sale_id IS NOT NULL THEN
        PERFORM public.academy_recompute_team_pack_seats(v_pending.counts_against_sale_id);
      END IF;
    END IF;
  END LOOP;

  SELECT COUNT(*)
  INTO v_team_pending
  FROM public.academy_pending_grants AS pending
  WHERE pending.email = v_email
    AND pending.claimed_at IS NULL
    AND pending.kind = 'team';

  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS member
    WHERE member.user_id = v_user_id
      AND member.role IN ('admin', 'owner')
  )
  INTO v_is_org_admin;

  IF v_team_pending = 0 THEN
    v_team_status := 'none';
  ELSIF v_is_org_admin THEN
    v_team_status := 'ready';
  ELSE
    v_team_status := 'needs_organization';
  END IF;

  RETURN jsonb_build_object(
    'personal_claimed', v_count,
    'team_pending', v_team_pending,
    'team_status', v_team_status
  );
END;
$$;

COMMENT ON FUNCTION public.academy_claim_pending_grants() IS
  'Signed-in users only. Attaches solo and redemption pending rows only when auth.users.email_confirmed_at is set and lower(trim(email)) matches the pending buyer email. Team rows are not attached here. If a Team row is waiting and the caller is not an org admin, team_status is needs_organization. The Academy routes PR (#38) should call this once after sign-in.';

REVOKE ALL ON FUNCTION public.academy_claim_pending_grants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.academy_claim_pending_grants() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Team claim: attach to an org the caller already administers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.academy_claim_pending_team_grant(p_organization_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_pending public.academy_pending_grants%ROWTYPE;
  v_entitlement_id uuid;
  v_linked integer := 0;
  v_seats integer := 0;
  v_claimed integer := 0;
BEGIN
  v_email := public.academy_confirmed_claim_email();
  v_user_id := auth.uid();

  IF v_email IS NULL
    OR v_user_id IS NULL
    OR NOT public.academy_user_email_is_confirmed_match(v_user_id, v_email)
  THEN
    RETURN jsonb_build_object(
      'status', 'unconfirmed',
      'claimed', 0,
      'seats', 0,
      'redemption_count', 0
    );
  END IF;

  IF p_organization_id IS NULL OR NOT public.is_org_admin(p_organization_id) THEN
    IF p_organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members AS member
        WHERE member.organization_id = p_organization_id
          AND member.user_id = v_user_id
      )
    THEN
      RETURN jsonb_build_object(
        'status', 'not_authorized',
        'claimed', 0,
        'seats', 0,
        'redemption_count', 0
      );
    END IF;

    RETURN jsonb_build_object(
      'status', 'needs_organization',
      'claimed', 0,
      'seats', 0,
      'redemption_count', 0
    );
  END IF;

  SELECT pending.*
  INTO v_pending
  FROM public.academy_pending_grants AS pending
  WHERE pending.email = v_email
    AND pending.kind = 'team'
    AND pending.claimed_at IS NULL
  ORDER BY pending.created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_pending.id IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.academy_pending_grants AS pending
      WHERE pending.email = v_email
        AND pending.kind = 'team'
        AND pending.claimed_at IS NOT NULL
    ) THEN
      RETURN jsonb_build_object(
        'status', 'already_claimed',
        'claimed', 0,
        'seats', 0,
        'redemption_count', 0
      );
    END IF;

    RETURN jsonb_build_object(
      'status', 'nothing_to_claim',
      'claimed', 0,
      'seats', 0,
      'redemption_count', 0
    );
  END IF;

  IF NOT public.academy_user_email_is_confirmed_match(v_user_id, v_pending.email) THEN
    RETURN jsonb_build_object(
      'status', 'unconfirmed',
      'claimed', 0,
      'seats', 0,
      'redemption_count', 0
    );
  END IF;

  v_linked := public.academy_linked_redemption_count(v_pending.gumroad_sale_id);
  v_seats := GREATEST(0, v_pending.seats - v_linked);

  v_entitlement_id := public.academy_insert_migrated_entitlement(
    'org',
    NULL,
    p_organization_id,
    v_pending.product_code,
    v_seats,
    v_pending.gumroad_sale_id,
    v_linked,
    NULL
  );

  IF v_entitlement_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'already_claimed',
      'claimed', 0,
      'seats', 0,
      'redemption_count', v_linked
    );
  END IF;

  UPDATE public.academy_pending_grants AS pending
  SET
    claimed_at = now(),
    claimed_entitlement_id = v_entitlement_id
  WHERE pending.id = v_pending.id
    AND pending.claimed_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_claimed',
      'claimed', 0,
      'seats', 0,
      'redemption_count', v_linked
    );
  END IF;

  v_seats := COALESCE(
    public.academy_recompute_team_pack_seats(v_pending.gumroad_sale_id),
    v_seats
  );
  v_linked := public.academy_linked_redemption_count(v_pending.gumroad_sale_id);
  v_claimed := 1;

  RETURN jsonb_build_object(
    'status', 'granted',
    'claimed', v_claimed,
    'seats', v_seats,
    'redemption_count', v_linked
  );
END;
$$;

COMMENT ON FUNCTION public.academy_claim_pending_team_grant(uuid) IS
  'Signed-in confirmed buyer only. Attaches one unclaimed Team pending grant to p_organization_id when the caller is an org admin of that org and the confirmed email matches the pending buyer email. Never creates an organization. Seats are pack size minus linked redemptions (minimum 0). Returns needs_organization when the caller cannot attach yet. Each pending row is claimed once.';

REVOKE ALL ON FUNCTION public.academy_claim_pending_team_grant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.academy_claim_pending_team_grant(uuid) TO authenticated, service_role;
