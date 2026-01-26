-- ============================================
-- EXPERT SERVICES CREDIT SYSTEM - PHASE 2: SECURITY HELPERS & RLS
-- ============================================

-- ============================================
-- SECURITY HELPER FUNCTIONS
-- ============================================

-- Check if current user is a member of an organization
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

-- Check if current user is an admin/owner of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

-- Check if current user is a member of a service provider
CREATE OR REPLACE FUNCTION public.is_provider_member(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM provider_members
    WHERE service_provider_id = p_provider_id
      AND user_id = auth.uid()
  );
$$;

-- Check if current user is an admin/owner of a service provider
CREATE OR REPLACE FUNCTION public.is_provider_admin(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM provider_members
    WHERE service_provider_id = p_provider_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

-- Get the provider ID for the current user (if they belong to exactly one)
CREATE OR REPLACE FUNCTION public.get_user_provider_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT service_provider_id FROM provider_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Check if an organization is a customer of a provider
CREATE OR REPLACE FUNCTION public.is_provider_customer(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM provider_customers pc
    JOIN provider_members pm ON pm.service_provider_id = pc.service_provider_id
    WHERE pc.organization_id = p_org_id
      AND pm.user_id = auth.uid()
  );
$$;

-- ============================================
-- RLS POLICIES: service_providers
-- ============================================

-- Anyone authenticated can view providers (for marketplace)
CREATE POLICY "Authenticated users can view providers"
ON public.service_providers FOR SELECT
TO authenticated
USING (true);

-- Only provider admins can update their own provider
CREATE POLICY "Provider admins can update their provider"
ON public.service_providers FOR UPDATE
TO authenticated
USING (is_provider_admin(id))
WITH CHECK (is_provider_admin(id));

-- ============================================
-- RLS POLICIES: organizations
-- ============================================

-- Org members can view their org
CREATE POLICY "Org members can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (is_org_member(id));

-- Provider members can view their customer orgs
CREATE POLICY "Provider members can view customer orgs"
ON public.organizations FOR SELECT
TO authenticated
USING (is_provider_customer(id));

-- Org admins can update their org
CREATE POLICY "Org admins can update their organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (is_org_admin(id))
WITH CHECK (is_org_admin(id));

-- ============================================
-- RLS POLICIES: provider_members
-- ============================================

-- Provider members can view their team
CREATE POLICY "Provider members can view their team"
ON public.provider_members FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- Provider admins can manage team
CREATE POLICY "Provider admins can insert members"
ON public.provider_members FOR INSERT
TO authenticated
WITH CHECK (is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can update members"
ON public.provider_members FOR UPDATE
TO authenticated
USING (is_provider_admin(service_provider_id))
WITH CHECK (is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can delete members"
ON public.provider_members FOR DELETE
TO authenticated
USING (is_provider_admin(service_provider_id));

-- ============================================
-- RLS POLICIES: organization_members
-- ============================================

-- Org members can view their team
CREATE POLICY "Org members can view their team"
ON public.organization_members FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Provider members can view customer org teams
CREATE POLICY "Provider members can view customer org teams"
ON public.organization_members FOR SELECT
TO authenticated
USING (is_provider_customer(organization_id));

-- Org admins can manage team
CREATE POLICY "Org admins can insert members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE
TO authenticated
USING (is_org_admin(organization_id))
WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE
TO authenticated
USING (is_org_admin(organization_id));

-- ============================================
-- RLS POLICIES: provider_customers
-- ============================================

-- Provider members can view their customers
CREATE POLICY "Provider members can view customers"
ON public.provider_customers FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- Org members can view their provider relationships
CREATE POLICY "Org members can view their providers"
ON public.provider_customers FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- System handles inserts via webhook (service role)

-- ============================================
-- RLS POLICIES: credit_bundles
-- ============================================

-- Anyone authenticated can view active bundles (for purchasing)
CREATE POLICY "Authenticated users can view active bundles"
ON public.credit_bundles FOR SELECT
TO authenticated
USING (is_active = true);

-- Provider admins can manage bundles
CREATE POLICY "Provider admins can insert bundles"
ON public.credit_bundles FOR INSERT
TO authenticated
WITH CHECK (is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can update bundles"
ON public.credit_bundles FOR UPDATE
TO authenticated
USING (is_provider_admin(service_provider_id))
WITH CHECK (is_provider_admin(service_provider_id));

-- ============================================
-- RLS POLICIES: orders
-- ============================================

-- Org members can view their orders
CREATE POLICY "Org members can view their orders"
ON public.orders FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Provider members can view orders from their customers
CREATE POLICY "Provider members can view customer orders"
ON public.orders FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- Org admins can create orders
CREATE POLICY "Org admins can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (is_org_admin(organization_id));

-- ============================================
-- RLS POLICIES: invoices
-- ============================================

-- Org members can view their invoices
CREATE POLICY "Org members can view their invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Provider members can view invoices for their customers
CREATE POLICY "Provider members can view customer invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- ============================================
-- RLS POLICIES: credit_lots
-- ============================================

-- Org members can view their credit lots
CREATE POLICY "Org members can view their credit lots"
ON public.credit_lots FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Provider members can view customer credit lots
CREATE POLICY "Provider members can view customer credit lots"
ON public.credit_lots FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- ============================================
-- RLS POLICIES: credit_ledger_entries
-- ============================================

-- Org members can view their ledger entries
CREATE POLICY "Org members can view their ledger"
ON public.credit_ledger_entries FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Provider members can view customer ledger
CREATE POLICY "Provider members can view customer ledger"
ON public.credit_ledger_entries FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- ============================================
-- RLS POLICIES: work_logs
-- ============================================

-- Org members can view work done for them
CREATE POLICY "Org members can view their work logs"
ON public.work_logs FOR SELECT
TO authenticated
USING (is_org_member(organization_id));

-- Provider members can view their work
CREATE POLICY "Provider members can view their work logs"
ON public.work_logs FOR SELECT
TO authenticated
USING (is_provider_member(service_provider_id));

-- ============================================
-- RLS POLICIES: lot_consumptions
-- ============================================

-- Org members can view consumption details
CREATE POLICY "Org members can view consumption details"
ON public.lot_consumptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM credit_lots cl
    WHERE cl.id = credit_lot_id
      AND is_org_member(cl.organization_id)
  )
);

-- Provider members can view consumption details
CREATE POLICY "Provider members can view consumption details"
ON public.lot_consumptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM credit_lots cl
    WHERE cl.id = credit_lot_id
      AND is_provider_member(cl.service_provider_id)
  )
);

-- ============================================
-- RLS POLICIES: audit_events
-- ============================================

-- Provider admins can view audit events for their provider
CREATE POLICY "Provider admins can view audit events"
ON public.audit_events FOR SELECT
TO authenticated
USING (
  service_provider_id IS NOT NULL 
  AND is_provider_admin(service_provider_id)
);

-- Org admins can view audit events for their org
CREATE POLICY "Org admins can view audit events"
ON public.audit_events FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND is_org_admin(organization_id)
);