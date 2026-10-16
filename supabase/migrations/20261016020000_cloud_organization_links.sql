-- Validated Hub organization → Elsa Control organization mapping.
-- Written only by service_role from the validated Control bootstrap result
-- (cloud-bff). Members can read their own org's row. No client writes.
-- Cloud checkout (#55) and the Cloud console (#77) read
-- control_organization_id through the server-side helper; they never use the
-- Hub org id as a stand-in or a client-supplied Control id.

CREATE TABLE public.cloud_organization_links (
  hub_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_organization_id uuid NOT NULL,
  validated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hub_organization_id),
  CONSTRAINT cloud_organization_links_control_organization_id_key
    UNIQUE (control_organization_id)
);

COMMENT ON TABLE public.cloud_organization_links IS
  'Validated Hub-to-Control organization link. One Control org per Hub org. Written by service_role from cloud-bff bootstrap; members may SELECT.';

COMMENT ON COLUMN public.cloud_organization_links.hub_organization_id IS
  'Hub organizations.id. Primary key so a Hub org has at most one Control org.';

COMMENT ON COLUMN public.cloud_organization_links.control_organization_id IS
  'Control organization id from the validated bootstrap result. Unique so two Hub orgs cannot share one Control org.';

COMMENT ON COLUMN public.cloud_organization_links.validated_at IS
  'Set when the row is written from a validated Control bootstrap result. Required; unvalidated rows are not stored.';

CREATE TRIGGER trg_cloud_organization_links_updated_at
BEFORE UPDATE ON public.cloud_organization_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cloud_organization_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cloud_organization_links FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.cloud_organization_links TO authenticated;
GRANT ALL ON TABLE public.cloud_organization_links TO service_role;

CREATE POLICY cloud_organization_links_select_member
ON public.cloud_organization_links
FOR SELECT
TO authenticated
USING (public.is_org_member(hub_organization_id));
