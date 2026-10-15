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
  CHECK (seats >= 0);

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
  'Gumroad grants waiting to be claimed. Email is lower-case. Solo and redemption rows become personal entitlements. Team rows attach to an org the buyer already administers. RLS is on and there is no client policy. Never creates an organization.';

COMMENT ON COLUMN public.academy_pending_grants.counts_against_sale_id IS
  'Buyer gumroad_sale_id that a 100%-off redemption is charged against. NULL means unmapped: the row is not charged to any Team pack.';

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
-- Shared helpers
-- ---------------------------------------------------------------------------

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
  v_user_email text;
  v_confirmed_at timestamp with time zone;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_jwt_email := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_jwt_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT users.email, users.email_confirmed_at
  INTO v_user_email, v_confirmed_at
  FROM auth.users AS users
  WHERE users.id = v_user_id;

  IF NOT FOUND OR v_confirmed_at IS NULL THEN
    RETURN NULL;
  END IF;

  IF lower(btrim(COALESCE(v_user_email, ''))) <> v_jwt_email THEN
    RETURN NULL;
  END IF;

  RETURN v_jwt_email;
END;
$$;

COMMENT ON FUNCTION public.academy_confirmed_claim_email() IS
  'Internal. Returns the lower-case JWT email when auth.users.email_confirmed_at is set and matches. Otherwise NULL.';

REVOKE ALL ON FUNCTION public.academy_confirmed_claim_email() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.academy_insert_migrated_entitlement(
  p_subject_type text,
  p_user_id uuid,
  p_organization_id uuid,
  p_product_code text,
  p_seats integer,
  p_gumroad_sale_id text,
  p_redemption_count integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
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

COMMENT ON FUNCTION public.academy_insert_migrated_entitlement(text, uuid, uuid, text, integer, text, integer) IS
  'Internal helper. Inserts a gumroad_migration entitlement. ON CONFLICT (gumroad_sale_id) DO NOTHING.';

REVOKE ALL ON FUNCTION public.academy_insert_migrated_entitlement(text, uuid, uuid, text, integer, text, integer) FROM PUBLIC, anon, authenticated;

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
BEGIN
  v_email := lower(btrim(COALESCE(p_email, '')));
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

  SELECT users.id
  INTO v_user_id
  FROM auth.users AS users
  WHERE lower(users.email) = v_email
  LIMIT 1;

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
      RETURN 'granted';
    END IF;

    v_entitlement_id := public.academy_insert_migrated_entitlement(
      'user',
      v_user_id,
      NULL,
      'solo_bundle',
      1,
      v_sale_id,
      NULL
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

    RETURN 'granted';
  END IF;

  IF p_dry_run THEN
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

  RETURN 'pending';
END;
$$;

COMMENT ON FUNCTION public.academy_grant_gumroad_sale(text, text, integer, text, text, text, text, boolean) IS
  'service_role only. Solo and mapped redemptions grant a personal solo_bundle entitlement when the Hub user exists. Team sales always stay pending. Redemptions link through counts_against_sale_id and are never guessed. Safe to call repeatedly. p_dry_run classifies without writing.';

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

  IF v_email IS NULL OR v_user_id IS NULL THEN
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
    v_entitlement_id := public.academy_insert_migrated_entitlement(
      'user',
      v_user_id,
      NULL,
      'solo_bundle',
      1,
      v_pending.gumroad_sale_id,
      NULL
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
  'Signed-in users only. Matches auth.jwt() email when auth.users.email_confirmed_at is set. Claims solo and redemption pending rows as personal solo_bundle entitlements. Team rows are not attached here. If a Team row is waiting and the caller is not an org admin, team_status is needs_organization. The Academy routes PR (#38) should call this once after sign-in.';

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

  IF v_email IS NULL OR v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'unconfirmed',
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

  v_linked := public.academy_linked_redemption_count(v_pending.gumroad_sale_id);
  v_seats := GREATEST(0, v_pending.seats - v_linked);

  v_entitlement_id := public.academy_insert_migrated_entitlement(
    'org',
    NULL,
    p_organization_id,
    v_pending.product_code,
    v_seats,
    v_pending.gumroad_sale_id,
    v_linked
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
  'Signed-in confirmed buyer only. Attaches one unclaimed Team pending grant to p_organization_id when the caller is an org admin of that org. Never creates an organization. Seats are pack size minus linked redemptions (minimum 0). Returns needs_organization when the caller cannot attach yet. Each pending row is claimed once. Converting redemption personal grants back into org seats is a follow-up RPC.';

REVOKE ALL ON FUNCTION public.academy_claim_pending_team_grant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.academy_claim_pending_team_grant(uuid) TO authenticated, service_role;
