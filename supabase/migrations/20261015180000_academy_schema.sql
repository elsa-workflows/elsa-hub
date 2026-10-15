-- Academy catalog, gated lesson bodies, entitlements and org seats.
-- New academy_* objects only. Stripe reuses the existing billing-profile
-- customer; this migration does not add a customer table.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  summary text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  stripe_price_id text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  product_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT academy_courses_slug_key UNIQUE (slug),
  CONSTRAINT academy_courses_slug_check CHECK (char_length(slug) BETWEEN 1 AND 120),
  CONSTRAINT academy_courses_title_check CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT academy_courses_price_cents_check CHECK (price_cents >= 0),
  CONSTRAINT academy_courses_currency_check CHECK (currency ~ '^[a-z]{3}$'),
  CONSTRAINT academy_courses_product_code_check CHECK (product_code ~ '^[a-z0-9_]+$')
);

COMMENT ON TABLE public.academy_courses IS
  'Published Academy course catalog. Readable by anyone when is_published. Writes are service_role only.';

COMMENT ON COLUMN public.academy_courses.product_code IS
  'Sellable SKU such as solo_bundle, team_5 or team_10. Lowercase letters, digits and underscore only.';

CREATE TABLE public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  body_md text,
  is_preview boolean NOT NULL DEFAULT false,
  duration_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT academy_lessons_course_slug_key UNIQUE (course_id, slug),
  CONSTRAINT academy_lessons_slug_check CHECK (char_length(slug) BETWEEN 1 AND 120),
  CONSTRAINT academy_lessons_title_check CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT academy_lessons_duration_minutes_check
    CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

COMMENT ON TABLE public.academy_lessons IS
  'Academy lessons. body_md lives on this table. RLS exposes the full row (including body_md) to anon and authenticated only when is_preview and the parent course is published. Non-preview rows, and therefore their bodies, are visible only when has_academy_access(course_id) is true. That row split is what keeps paid bodies from leaking to anon.';

CREATE TABLE public.academy_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.academy_lessons(id) ON DELETE SET NULL,
  label text NOT NULL,
  storage_path text NOT NULL,
  sha256 text,
  size_bytes bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT academy_assets_label_check CHECK (char_length(label) BETWEEN 1 AND 200),
  CONSTRAINT academy_assets_storage_path_check CHECK (char_length(storage_path) BETWEEN 1 AND 1024),
  CONSTRAINT academy_assets_sha256_check CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT academy_assets_size_bytes_check CHECK (size_bytes IS NULL OR size_bytes >= 0),
  CONSTRAINT academy_assets_storage_path_key UNIQUE (storage_path)
);

COMMENT ON TABLE public.academy_assets IS
  'Kit files in the private academy-kits bucket. Rows are readable only with has_academy_access(course_id).';

CREATE TABLE public.academy_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.academy_courses(id) ON DELETE RESTRICT,
  product_code text,
  subject_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  seats integer NOT NULL,
  source text NOT NULL,
  stripe_checkout_session_id text,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  CONSTRAINT academy_entitlements_subject_type_check
    CHECK (subject_type IN ('user', 'org')),
  CONSTRAINT academy_entitlements_source_check
    CHECK (source IN ('stripe', 'gumroad_migration', 'manual')),
  CONSTRAINT academy_entitlements_subject_xor_check
    CHECK (
      (subject_type = 'user' AND user_id IS NOT NULL AND organization_id IS NULL)
      OR (subject_type = 'org' AND organization_id IS NOT NULL AND user_id IS NULL)
    ),
  CONSTRAINT academy_entitlements_grant_target_check
    CHECK (course_id IS NOT NULL OR product_code IS NOT NULL),
  CONSTRAINT academy_entitlements_product_code_check
    CHECK (product_code IS NULL OR product_code ~ '^[a-z0-9_]+$'),
  CONSTRAINT academy_entitlements_seats_check CHECK (seats > 0),
  CONSTRAINT academy_entitlements_stripe_checkout_session_id_key
    UNIQUE (stripe_checkout_session_id)
);

COMMENT ON TABLE public.academy_entitlements IS
  'User or org grant for a course or a bundle SKU (product_code). stripe_checkout_session_id is UNIQUE so a replayed webhook can INSERT ... ON CONFLICT (stripe_checkout_session_id) DO NOTHING.';

CREATE TABLE public.academy_seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id uuid NOT NULL REFERENCES public.academy_entitlements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT academy_seat_assignments_entitlement_user_key UNIQUE (entitlement_id, user_id)
);

COMMENT ON TABLE public.academy_seat_assignments IS
  'Org seat holders. Count is capped by academy_entitlements.seats via trigger and assign_academy_seat.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX academy_courses_published_sort_idx
  ON public.academy_courses (is_published, sort_order);

CREATE INDEX academy_lessons_course_sort_idx
  ON public.academy_lessons (course_id, sort_order);

CREATE INDEX academy_assets_course_id_idx
  ON public.academy_assets (course_id);

CREATE INDEX academy_assets_lesson_id_idx
  ON public.academy_assets (lesson_id);

CREATE INDEX academy_entitlements_user_id_idx
  ON public.academy_entitlements (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX academy_entitlements_organization_id_idx
  ON public.academy_entitlements (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX academy_entitlements_course_id_idx
  ON public.academy_entitlements (course_id)
  WHERE course_id IS NOT NULL;

CREATE INDEX academy_entitlements_product_code_idx
  ON public.academy_entitlements (product_code)
  WHERE product_code IS NOT NULL;

CREATE INDEX academy_seat_assignments_user_id_idx
  ON public.academy_seat_assignments (user_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_academy_courses_updated_at
BEFORE UPDATE ON public.academy_courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_academy_lessons_updated_at
BEFORE UPDATE ON public.academy_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_academy_assets_updated_at
BEFORE UPDATE ON public.academy_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Access helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_academy_access(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.academy_entitlements AS entitlement
      WHERE entitlement.revoked_at IS NULL
        AND entitlement.user_id = auth.uid()
        AND (
          entitlement.course_id = p_course_id
          OR (
            entitlement.course_id IS NULL
            AND entitlement.product_code IS NOT NULL
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.academy_seat_assignments AS assignment
      JOIN public.academy_entitlements AS entitlement
        ON entitlement.id = assignment.entitlement_id
      WHERE assignment.user_id = auth.uid()
        AND entitlement.revoked_at IS NULL
        AND (
          entitlement.course_id = p_course_id
          OR (
            entitlement.course_id IS NULL
            AND entitlement.product_code IS NOT NULL
          )
        )
    );
$$;

COMMENT ON FUNCTION public.has_academy_access(uuid) IS
  'True for a platform admin, an active personal entitlement (course or bundle SKU), or an active org seat assignment.';

-- ---------------------------------------------------------------------------
-- Seat limit trigger (also covers service_role inserts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.academy_enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seats integer;
  v_used integer;
BEGIN
  SELECT entitlement.seats
  INTO v_seats
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.id = NEW.entitlement_id
  FOR UPDATE;

  IF v_seats IS NULL THEN
    RAISE EXCEPTION 'entitlement not found';
  END IF;

  SELECT COUNT(*)
  INTO v_used
  FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = NEW.entitlement_id
    AND assignment.id IS DISTINCT FROM NEW.id;

  IF v_used + 1 > v_seats THEN
    RAISE EXCEPTION 'seat limit of % exceeded', v_seats;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_academy_seat_assignments_limit
BEFORE INSERT OR UPDATE OF entitlement_id ON public.academy_seat_assignments
FOR EACH ROW EXECUTE FUNCTION public.academy_enforce_seat_limit();

-- ---------------------------------------------------------------------------
-- Org-admin seat RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_academy_seat(
  p_entitlement_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_organization_id uuid;
  v_subject_type text;
  v_revoked_at timestamp with time zone;
  v_seats integer;
  v_used integer;
  v_assignment_id uuid;
BEGIN
  SELECT
    entitlement.organization_id,
    entitlement.subject_type,
    entitlement.revoked_at,
    entitlement.seats
  INTO v_organization_id, v_subject_type, v_revoked_at, v_seats
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.id = p_entitlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entitlement not found';
  END IF;

  IF v_subject_type <> 'org' OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'seat assignment requires an org entitlement';
  END IF;

  IF v_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'entitlement is revoked';
  END IF;

  IF NOT (
    public.is_org_admin(v_organization_id)
    OR public.is_platform_admin()
  ) THEN
    RAISE EXCEPTION 'not authorized to assign seats';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members AS member
    WHERE member.organization_id = v_organization_id
      AND member.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'user is not a member of the organization';
  END IF;

  SELECT assignment.id
  INTO v_assignment_id
  FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = p_entitlement_id
    AND assignment.user_id = p_user_id;

  IF v_assignment_id IS NOT NULL THEN
    RETURN v_assignment_id;
  END IF;

  SELECT COUNT(*)
  INTO v_used
  FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = p_entitlement_id;

  IF v_used >= v_seats THEN
    RAISE EXCEPTION 'seat limit of % exceeded', v_seats;
  END IF;

  INSERT INTO public.academy_seat_assignments (entitlement_id, user_id)
  VALUES (p_entitlement_id, p_user_id)
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unassign_academy_seat(
  p_entitlement_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_organization_id uuid;
  v_subject_type text;
BEGIN
  SELECT
    entitlement.organization_id,
    entitlement.subject_type
  INTO v_organization_id, v_subject_type
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.id = p_entitlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entitlement not found';
  END IF;

  IF v_subject_type <> 'org' OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'seat assignment requires an org entitlement';
  END IF;

  IF NOT (
    public.is_org_admin(v_organization_id)
    OR public.is_platform_admin()
  ) THEN
    RAISE EXCEPTION 'not authorized to unassign seats';
  END IF;

  DELETE FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = p_entitlement_id
    AND assignment.user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.academy_courses TO anon, authenticated;
GRANT SELECT ON public.academy_lessons TO anon, authenticated;
GRANT SELECT ON public.academy_assets TO anon, authenticated;
GRANT SELECT ON public.academy_entitlements TO authenticated;
GRANT SELECT ON public.academy_seat_assignments TO authenticated;

GRANT ALL ON public.academy_courses TO service_role;
GRANT ALL ON public.academy_lessons TO service_role;
GRANT ALL ON public.academy_assets TO service_role;
GRANT ALL ON public.academy_entitlements TO service_role;
GRANT ALL ON public.academy_seat_assignments TO service_role;

GRANT EXECUTE ON FUNCTION public.has_academy_access(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_academy_seat(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unassign_academy_seat(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: enable, no write policies for anon or authenticated
-- ---------------------------------------------------------------------------

ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_seat_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY academy_courses_select_published
  ON public.academy_courses
  FOR SELECT
  TO anon, authenticated
  USING (is_published);

CREATE POLICY academy_courses_select_admin
  ON public.academy_courses
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- Preview lessons of a published course: full row, including body_md.
CREATE POLICY academy_lessons_select_preview
  ON public.academy_lessons
  FOR SELECT
  TO anon, authenticated
  USING (
    is_preview
    AND EXISTS (
      SELECT 1
      FROM public.academy_courses AS course
      WHERE course.id = academy_lessons.course_id
        AND course.is_published
    )
  );

-- Entitled users and platform admins: every lesson of that course, including body_md.
CREATE POLICY academy_lessons_select_entitled
  ON public.academy_lessons
  FOR SELECT
  TO authenticated
  USING (public.has_academy_access(course_id));

CREATE POLICY academy_assets_select_entitled
  ON public.academy_assets
  FOR SELECT
  TO authenticated
  USING (public.has_academy_access(course_id));

CREATE POLICY academy_entitlements_select_own
  ON public.academy_entitlements
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
    OR (
      organization_id IS NOT NULL
      AND public.is_org_admin(organization_id)
    )
  );

CREATE POLICY academy_seat_assignments_select_own
  ON public.academy_seat_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.academy_entitlements AS entitlement
      WHERE entitlement.id = academy_seat_assignments.entitlement_id
        AND entitlement.organization_id IS NOT NULL
        AND public.is_org_admin(entitlement.organization_id)
    )
  );
