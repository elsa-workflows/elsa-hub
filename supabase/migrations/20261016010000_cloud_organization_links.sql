-- Validated Hub organization → Elsa Control organization mapping.
-- Cloud checkout reads control_organization_id from this table and never
-- uses the Hub org id as a stand-in or a client-supplied Control id.
-- Rows exist only after the link is validated (validated_at is required).
-- Written by service_role (account linking / bootstrap). Members can read.

CREATE TABLE public.cloud_organization_links (
  hub_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_organization_id uuid NOT NULL,
  validated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hub_organization_id),
  UNIQUE (control_organization_id)
);

COMMENT ON TABLE public.cloud_organization_links IS
  'Validated Hub-to-Control organization link. Cloud checkout writes elsa_control_organization_id from control_organization_id. One Control org per Hub org.';

CREATE TRIGGER trg_cloud_organization_links_updated_at
BEFORE UPDATE ON public.cloud_organization_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cloud_organization_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cloud_organization_links FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.cloud_organization_links TO authenticated;
GRANT ALL ON TABLE public.cloud_organization_links TO service_role;

CREATE POLICY "Org members can read validated Control organization links"
ON public.cloud_organization_links
FOR SELECT
TO authenticated
USING (public.is_org_member(hub_organization_id));
