-- R2: scope bundle grants to academy_courses.product_codes, require current
-- org membership for seats, tighten GRANT/REVOKE, check seat RPC auth first.

-- ---------------------------------------------------------------------------
-- product_codes allow-list (source of truth for bundle SKU matching)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.academy_product_codes_valid(p_codes text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    p_codes IS NOT NULL
    AND cardinality(p_codes) >= 1
    AND COALESCE((
      SELECT bool_and(code ~ '^[a-z0-9_]+$')
      FROM unnest(p_codes) AS code
    ), false);
$$;

ALTER TABLE public.academy_courses
  ADD COLUMN product_codes text[];

UPDATE public.academy_courses
SET product_codes = ARRAY[product_code]
WHERE product_codes IS NULL;

ALTER TABLE public.academy_courses
  ALTER COLUMN product_codes SET NOT NULL;

ALTER TABLE public.academy_courses
  ADD CONSTRAINT academy_courses_product_codes_check
    CHECK (public.academy_product_codes_valid(product_codes));

ALTER TABLE public.academy_courses
  ADD CONSTRAINT academy_courses_product_code_in_codes_check
    CHECK (product_code = ANY (product_codes));

CREATE OR REPLACE FUNCTION public.academy_courses_sync_product_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.product_codes IS NULL OR cardinality(NEW.product_codes) = 0 THEN
    NEW.product_codes := ARRAY[NEW.product_code];
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_academy_courses_sync_product_codes
BEFORE INSERT OR UPDATE OF product_code, product_codes ON public.academy_courses
FOR EACH ROW EXECUTE FUNCTION public.academy_courses_sync_product_codes();

CREATE INDEX academy_courses_product_codes_idx
  ON public.academy_courses USING GIN (product_codes);

COMMENT ON COLUMN public.academy_courses.product_codes IS
  'Bundle SKUs that grant this course (for example solo_bundle, team_5, team_10). has_academy_access matches entitlement.product_code against this list. product_code remains the primary catalog SKU and must appear in the list.';

-- ---------------------------------------------------------------------------
-- has_academy_access: published course, matching SKU, current org member
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
      FROM public.academy_courses AS course
      WHERE course.id = p_course_id
        AND course.is_published
        AND (
          EXISTS (
            SELECT 1
            FROM public.academy_entitlements AS entitlement
            WHERE entitlement.revoked_at IS NULL
              AND entitlement.user_id = (SELECT auth.uid())
              AND (
                entitlement.course_id = p_course_id
                OR (
                  entitlement.course_id IS NULL
                  AND entitlement.product_code IS NOT NULL
                  AND entitlement.product_code = ANY (course.product_codes)
                )
              )
          )
          OR EXISTS (
            SELECT 1
            FROM public.academy_seat_assignments AS assignment
            JOIN public.academy_entitlements AS entitlement
              ON entitlement.id = assignment.entitlement_id
            JOIN public.organization_members AS member
              ON member.organization_id = entitlement.organization_id
             AND member.user_id = assignment.user_id
            WHERE assignment.user_id = (SELECT auth.uid())
              AND entitlement.revoked_at IS NULL
              AND (
                entitlement.course_id = p_course_id
                OR (
                  entitlement.course_id IS NULL
                  AND entitlement.product_code IS NOT NULL
                  AND entitlement.product_code = ANY (course.product_codes)
                )
              )
          )
        )
    );
$$;

COMMENT ON FUNCTION public.has_academy_access(uuid) IS
  'True for a platform admin, or a non-admin with an active personal entitlement or current-member org seat on a published course. Bundle SKUs must appear in academy_courses.product_codes. A course_id entitlement matches only that course.';

-- ---------------------------------------------------------------------------
-- Seat RPCs: authorise before any entitlement lookup
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
  IF NOT (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.user_id = (SELECT auth.uid())
        AND member.role IN ('admin', 'owner')
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to assign seats';
  END IF;

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

  IF NOT (
    public.is_platform_admin()
    OR (
      v_organization_id IS NOT NULL
      AND public.is_org_admin(v_organization_id)
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to assign seats';
  END IF;

  IF v_subject_type <> 'org' OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'seat assignment requires an org entitlement';
  END IF;

  IF v_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'entitlement is revoked';
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
  IF NOT (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS member
      WHERE member.user_id = (SELECT auth.uid())
        AND member.role IN ('admin', 'owner')
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to unassign seats';
  END IF;

  SELECT
    entitlement.organization_id,
    entitlement.subject_type
  INTO v_organization_id, v_subject_type
  FROM public.academy_entitlements AS entitlement
  WHERE entitlement.id = p_entitlement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entitlement not found';
  END IF;

  IF NOT (
    public.is_platform_admin()
    OR (
      v_organization_id IS NOT NULL
      AND public.is_org_admin(v_organization_id)
    )
  ) THEN
    RAISE EXCEPTION 'not authorized to unassign seats';
  END IF;

  IF v_subject_type <> 'org' OR v_organization_id IS NULL THEN
    RAISE EXCEPTION 'seat assignment requires an org entitlement';
  END IF;

  DELETE FROM public.academy_seat_assignments AS assignment
  WHERE assignment.entitlement_id = p_entitlement_id
    AND assignment.user_id = p_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants: revoke PUBLIC/anon execute and table ALL, then grant the minimum
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.has_academy_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_academy_seat(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unassign_academy_seat(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.academy_enforce_seat_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_product_codes_valid(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.academy_courses_sync_product_codes() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_academy_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_academy_seat(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unassign_academy_seat(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON TABLE public.academy_courses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.academy_lessons FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.academy_assets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.academy_entitlements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.academy_seat_assignments FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.academy_courses TO anon, authenticated;
GRANT SELECT ON TABLE public.academy_lessons TO anon, authenticated;
GRANT SELECT ON TABLE public.academy_assets TO authenticated;
GRANT SELECT ON TABLE public.academy_entitlements TO authenticated;
GRANT SELECT ON TABLE public.academy_seat_assignments TO authenticated;

GRANT ALL ON TABLE public.academy_courses TO service_role;
GRANT ALL ON TABLE public.academy_lessons TO service_role;
GRANT ALL ON TABLE public.academy_assets TO service_role;
GRANT ALL ON TABLE public.academy_entitlements TO service_role;
GRANT ALL ON TABLE public.academy_seat_assignments TO service_role;

-- ---------------------------------------------------------------------------
-- Policies: (select auth.uid())
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS academy_entitlements_select_own ON public.academy_entitlements;
CREATE POLICY academy_entitlements_select_own
  ON public.academy_entitlements
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_platform_admin()
    OR (
      organization_id IS NOT NULL
      AND public.is_org_admin(organization_id)
    )
  );

DROP POLICY IF EXISTS academy_seat_assignments_select_own ON public.academy_seat_assignments;
CREATE POLICY academy_seat_assignments_select_own
  ON public.academy_seat_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.academy_entitlements AS entitlement
      WHERE entitlement.id = academy_seat_assignments.entitlement_id
        AND entitlement.organization_id IS NOT NULL
        AND public.is_org_admin(entitlement.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: qualify objects.name
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS academy_kits_select_entitled ON storage.objects;
CREATE POLICY academy_kits_select_entitled
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'academy-kits'
    AND EXISTS (
      SELECT 1
      FROM public.academy_assets AS asset
      WHERE asset.storage_path = storage.objects.name
        AND public.has_academy_access(asset.course_id)
    )
  );
