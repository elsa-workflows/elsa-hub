-- 1. Engagement workspaces: one per (org, provider) pair
CREATE TABLE public.engagement_workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  service_provider_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_provider_id)
);

CREATE INDEX idx_engagement_workspaces_org ON public.engagement_workspaces(organization_id);
CREATE INDEX idx_engagement_workspaces_provider ON public.engagement_workspaces(service_provider_id);

GRANT SELECT ON public.engagement_workspaces TO authenticated;
GRANT ALL ON public.engagement_workspaces TO service_role;

ALTER TABLE public.engagement_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their workspaces"
  ON public.engagement_workspaces
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Provider members can view their workspaces"
  ON public.engagement_workspaces
  FOR SELECT TO authenticated
  USING (is_provider_member(service_provider_id));

CREATE TRIGGER update_engagement_workspaces_updated_at
  BEFORE UPDATE ON public.engagement_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Membership helper used by all workspace child tables
CREATE OR REPLACE FUNCTION public.is_engagement_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM engagement_workspaces ew
    WHERE ew.id = p_workspace_id
      AND (is_org_member(ew.organization_id) OR is_provider_member(ew.service_provider_id))
  );
$$;

REVOKE ALL ON FUNCTION public.is_engagement_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_engagement_member(UUID) TO authenticated, service_role;

-- 3. Get-or-create RPC (mirrors get_or_create_conversation)
CREATE OR REPLACE FUNCTION public.get_or_create_engagement_workspace(
  p_org_id UUID,
  p_provider_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  IF NOT (is_org_member(p_org_id) OR is_provider_member(p_provider_id)) THEN
    RAISE EXCEPTION 'Access denied: must be a member of the organization or service provider';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM provider_customers
    WHERE organization_id = p_org_id
      AND service_provider_id = p_provider_id
  ) THEN
    RAISE EXCEPTION 'Organization is not a customer of this service provider';
  END IF;

  SELECT id INTO _id
  FROM engagement_workspaces
  WHERE organization_id = p_org_id
    AND service_provider_id = p_provider_id;

  IF _id IS NULL THEN
    INSERT INTO engagement_workspaces (organization_id, service_provider_id)
    VALUES (p_org_id, p_provider_id)
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_engagement_workspace(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_engagement_workspace(UUID, UUID) TO authenticated, service_role;