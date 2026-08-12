CREATE TYPE public.product_kind AS ENUM ('runtime_subscription');
CREATE TYPE public.registry_grant_status AS ENUM ('pending', 'active', 'revoked', 'expired');

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  kind public.product_kind NOT NULL DEFAULT 'runtime_subscription',
  name text NOT NULL,
  slug text NOT NULL,
  tier text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  recurring_interval text NOT NULL DEFAULT 'year',
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  triage_response_business_days integer,
  includes_backports boolean NOT NULL DEFAULT false,
  slot_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_provider_id, slug)
);

GRANT SELECT ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active products"
  ON public.products FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Provider admins can view all products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_provider_admin(service_provider_id) OR public.is_platform_admin());

CREATE POLICY "Provider admins can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_provider_admin(service_provider_id))
  WITH CHECK (public.is_provider_admin(service_provider_id));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. subscriptions can reference either product line
ALTER TABLE public.subscriptions ALTER COLUMN credit_bundle_id DROP NOT NULL;
ALTER TABLE public.subscriptions ADD COLUMN product_id uuid REFERENCES public.products(id);
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_one_product_line
  CHECK (num_nonnulls(credit_bundle_id, product_id) = 1);

-- 3. registry grants
CREATE TABLE public.registry_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL UNIQUE REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  registry_token_name text NOT NULL,
  scope_map_name text NOT NULL,
  status public.registry_grant_status NOT NULL DEFAULT 'pending',
  issued_at timestamptz,
  token_expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  issued_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.registry_grants IS
  'Inventory of container registry access grants. INTENTIONALLY stores no token password or other credential material: the registry generates the password, it is delivered to the subscriber once out of band, and it must never be persisted here. Do not add a password/secret column. A leaked row must be an inventory disclosure, not a credential disclosure.';

GRANT SELECT ON public.registry_grants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.registry_grants TO authenticated;
GRANT ALL ON public.registry_grants TO service_role;

ALTER TABLE public.registry_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their registry grants"
  ON public.registry_grants FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY "Provider members can view customer registry grants"
  ON public.registry_grants FOR SELECT TO authenticated
  USING (public.is_provider_member(service_provider_id) OR public.is_platform_admin());

CREATE POLICY "Provider admins can insert registry grants"
  ON public.registry_grants FOR INSERT TO authenticated
  WITH CHECK (public.is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can update registry grants"
  ON public.registry_grants FOR UPDATE TO authenticated
  USING (public.is_provider_admin(service_provider_id))
  WITH CHECK (public.is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can delete registry grants"
  ON public.registry_grants FOR DELETE TO authenticated
  USING (public.is_provider_admin(service_provider_id));

CREATE TRIGGER update_registry_grants_updated_at
  BEFORE UPDATE ON public.registry_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. reconciliation view (work list for manual token issue/revoke)
CREATE VIEW public.runtime_grant_reconciliation
WITH (security_invoker = true) AS
SELECT
  s.id AS subscription_id,
  s.organization_id,
  o.name AS organization_name,
  s.service_provider_id,
  p.id AS product_id,
  p.name AS product_name,
  p.tier,
  s.status AS subscription_status,
  s.current_period_end,
  g.id AS registry_grant_id,
  g.status AS grant_status,
  g.registry_token_name,
  g.token_expires_at,
  'needs_issue'::text AS reason
FROM public.subscriptions s
JOIN public.products p ON p.id = s.product_id
JOIN public.organizations o ON o.id = s.organization_id
LEFT JOIN public.registry_grants g
  ON g.subscription_id = s.id AND g.status = 'active'
WHERE p.kind = 'runtime_subscription'
  AND s.status = 'active'
  AND g.id IS NULL

UNION ALL

SELECT
  s.id, s.organization_id, o.name, s.service_provider_id,
  p.id, p.name, p.tier, s.status, s.current_period_end,
  g.id, g.status, g.registry_token_name, g.token_expires_at,
  'needs_revoke'::text
FROM public.registry_grants g
JOIN public.subscriptions s ON s.id = g.subscription_id
JOIN public.products p ON p.id = s.product_id
JOIN public.organizations o ON o.id = s.organization_id
WHERE g.status = 'active'
  AND (
    s.status = 'canceled'
    OR (s.status <> 'active'
        AND s.current_period_end IS NOT NULL
        AND s.current_period_end < now() - interval '30 days')
  )

UNION ALL

SELECT
  s.id, s.organization_id, o.name, s.service_provider_id,
  p.id, p.name, p.tier, s.status, s.current_period_end,
  g.id, g.status, g.registry_token_name, g.token_expires_at,
  'expiry_drift'::text
FROM public.registry_grants g
JOIN public.subscriptions s ON s.id = g.subscription_id
JOIN public.products p ON p.id = s.product_id
JOIN public.organizations o ON o.id = s.organization_id
WHERE g.status = 'active'
  AND g.token_expires_at IS NOT NULL
  AND s.current_period_end IS NOT NULL
  AND g.token_expires_at > s.current_period_end;

GRANT SELECT ON public.runtime_grant_reconciliation TO authenticated;
GRANT SELECT ON public.runtime_grant_reconciliation TO service_role;