-- =============================================
-- PLATFORM ADMIN INFRASTRUCTURE
-- =============================================

-- 1. Create platform_admins table
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 3. Create admin check function (SECURITY DEFINER to prevent recursive RLS)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = auth.uid()
  )
$$;

-- 4. RLS policy for platform_admins table
CREATE POLICY "Platform admins can view admin list"
  ON public.platform_admins
  FOR SELECT
  USING (is_platform_admin());

-- 5. Seed initial admin (sipkeschoorstra@outlook.com)
INSERT INTO public.platform_admins (user_id) 
VALUES ('c33ba42e-5927-4989-beee-017b09caef35');

-- =============================================
-- ADMIN DATA ACCESS FUNCTIONS
-- =============================================

-- 6. Get admin overview stats
CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_organizations BIGINT,
  total_orders BIGINT,
  total_revenue_cents BIGINT,
  active_subscriptions BIGINT,
  pending_invitations BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin access
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM organizations)::BIGINT as total_organizations,
    (SELECT COUNT(*) FROM orders WHERE status = 'paid')::BIGINT as total_orders,
    (SELECT COALESCE(SUM(amount_cents), 0) FROM orders WHERE status = 'paid')::BIGINT as total_revenue_cents,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')::BIGINT as active_subscriptions,
    (SELECT COUNT(*) FROM invitations WHERE status = 'pending' AND expires_at > now())::BIGINT as pending_invitations;
END;
$$;

-- 7. Get all users for admin
CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  organization_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.display_name,
    p.avatar_url,
    p.created_at,
    (SELECT COUNT(*) FROM organization_members om WHERE om.user_id = p.user_id)::BIGINT as organization_count
  FROM profiles p
  WHERE (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.display_name ILIKE '%' || p_search || '%')
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. Get all organizations for admin
CREATE OR REPLACE FUNCTION public.get_admin_organizations(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  member_count BIGINT,
  total_credits_purchased BIGINT,
  available_credits BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.created_at,
    (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id)::BIGINT as member_count,
    COALESCE((SELECT SUM(minutes_purchased) FROM credit_lots cl WHERE cl.organization_id = o.id), 0)::BIGINT as total_credits_purchased,
    COALESCE((SELECT SUM(minutes_remaining) FROM credit_lots cl WHERE cl.organization_id = o.id AND cl.status = 'active'), 0)::BIGINT as available_credits
  FROM organizations o
  WHERE (p_search IS NULL OR o.name ILIKE '%' || p_search || '%' OR o.slug ILIKE '%' || p_search || '%')
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 9. Get all orders for admin
CREATE OR REPLACE FUNCTION public.get_admin_orders(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  bundle_name TEXT,
  amount_cents INTEGER,
  currency TEXT,
  status order_status,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT 
    ord.id,
    ord.organization_id,
    org.name as organization_name,
    cb.name as bundle_name,
    ord.amount_cents,
    ord.currency,
    ord.status,
    ord.created_at,
    ord.paid_at
  FROM orders ord
  JOIN organizations org ON org.id = ord.organization_id
  JOIN credit_bundles cb ON cb.id = ord.credit_bundle_id
  WHERE (p_status IS NULL OR ord.status::TEXT = p_status)
  ORDER BY ord.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 10. Get all invitations for admin
CREATE OR REPLACE FUNCTION public.get_admin_invitations(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  organization_id UUID,
  organization_name TEXT,
  role org_role,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  invited_by_email TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.organization_id,
    org.name as organization_name,
    i.role,
    i.status,
    i.created_at,
    i.expires_at,
    p.email as invited_by_email
  FROM invitations i
  JOIN organizations org ON org.id = i.organization_id
  LEFT JOIN profiles p ON p.user_id = i.invited_by
  WHERE (p_status IS NULL OR i.status = p_status)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 11. Get audit events for admin
CREATE OR REPLACE FUNCTION public.get_admin_audit_events(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  actor_type actor_type,
  actor_email TEXT,
  entity_type TEXT,
  entity_id UUID,
  action TEXT,
  organization_name TEXT,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id,
    ae.actor_type,
    p.email as actor_email,
    ae.entity_type,
    ae.entity_id,
    ae.action,
    org.name as organization_name,
    ae.before_json,
    ae.after_json,
    ae.created_at
  FROM audit_events ae
  LEFT JOIN profiles p ON p.user_id = ae.actor_user_id
  LEFT JOIN organizations org ON org.id = ae.organization_id
  WHERE (p_entity_type IS NULL OR ae.entity_type = p_entity_type)
  ORDER BY ae.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;