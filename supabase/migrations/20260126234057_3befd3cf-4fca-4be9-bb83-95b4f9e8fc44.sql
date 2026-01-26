-- ============================================
-- EXPERT SERVICES CREDIT SYSTEM - PHASE 1: SCHEMA
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.credit_lot_status AS ENUM ('active', 'exhausted', 'expired');
CREATE TYPE public.ledger_entry_type AS ENUM ('credit', 'debit');
CREATE TYPE public.ledger_reason_code AS ENUM ('purchase', 'usage', 'adjustment', 'expiry', 'refund');
CREATE TYPE public.work_category AS ENUM ('development', 'consulting', 'training', 'support', 'other');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'void');
CREATE TYPE public.actor_type AS ENUM ('user', 'system');
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.provider_role AS ENUM ('owner', 'admin', 'member');

-- ============================================
-- CORE ENTITY TABLES
-- ============================================

-- Service Providers (the companies offering expert services)
CREATE TABLE public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations (customers who purchase credits)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider team members
CREATE TABLE public.provider_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.provider_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_provider_id, user_id)
);

-- Organization team members
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Provider-Customer relationships
CREATE TABLE public.provider_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_provider_id, organization_id)
);

-- ============================================
-- CREDIT BUNDLES (Products)
-- ============================================

CREATE TABLE public.credit_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  hours INTEGER NOT NULL CHECK (hours > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'eur', 'gbp')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ORDERS & INVOICES
-- ============================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  credit_bundle_id UUID NOT NULL REFERENCES public.credit_bundles(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  stripe_receipt_url TEXT,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CREDIT LOTS
-- ============================================

CREATE TABLE public.credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  minutes_purchased INTEGER NOT NULL CHECK (minutes_purchased > 0),
  minutes_remaining INTEGER NOT NULL CHECK (minutes_remaining >= 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status public.credit_lot_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CREDIT LEDGER (Append-Only)
-- ============================================

CREATE TABLE public.credit_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  entry_type public.ledger_entry_type NOT NULL,
  minutes_delta INTEGER NOT NULL,
  reason_code public.ledger_reason_code NOT NULL,
  notes TEXT,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_credit_lot_id UUID REFERENCES public.credit_lots(id) ON DELETE SET NULL,
  related_work_log_id UUID,
  actor_type public.actor_type NOT NULL DEFAULT 'user',
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_credit CHECK (entry_type = 'credit' AND minutes_delta > 0 OR entry_type = 'debit' AND minutes_delta < 0)
);

-- ============================================
-- WORK LOGS
-- ============================================

CREATE TABLE public.work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  performed_at TIMESTAMPTZ NOT NULL,
  category public.work_category NOT NULL,
  description TEXT NOT NULL,
  minutes_spent INTEGER NOT NULL CHECK (minutes_spent > 0),
  is_billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Add FK for related_work_log_id after work_logs exists
ALTER TABLE public.credit_ledger_entries 
ADD CONSTRAINT fk_related_work_log 
FOREIGN KEY (related_work_log_id) REFERENCES public.work_logs(id) ON DELETE SET NULL;

-- ============================================
-- LOT CONSUMPTIONS (Junction table for FIFO tracking)
-- ============================================

CREATE TABLE public.lot_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_lot_id UUID NOT NULL REFERENCES public.credit_lots(id) ON DELETE RESTRICT,
  work_log_id UUID REFERENCES public.work_logs(id) ON DELETE SET NULL,
  adjustment_ledger_entry_id UUID REFERENCES public.credit_ledger_entries(id) ON DELETE SET NULL,
  minutes_consumed INTEGER NOT NULL CHECK (minutes_consumed > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT has_source CHECK (work_log_id IS NOT NULL OR adjustment_ledger_entry_id IS NOT NULL)
);

-- ============================================
-- AUDIT EVENTS
-- ============================================

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_provider_id UUID REFERENCES public.service_providers(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_type public.actor_type NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================

-- Idempotency indexes (partial unique)
CREATE UNIQUE INDEX idx_credit_lots_order_unique 
ON public.credit_lots (order_id) 
WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX idx_ledger_purchase_order_unique 
ON public.credit_ledger_entries (related_order_id) 
WHERE related_order_id IS NOT NULL 
  AND entry_type = 'credit' 
  AND reason_code = 'purchase';

CREATE UNIQUE INDEX idx_invoices_order_unique 
ON public.invoices (order_id) 
WHERE order_id IS NOT NULL;

-- Performance indexes
CREATE INDEX idx_credit_lots_fifo 
ON public.credit_lots (service_provider_id, organization_id, expires_at ASC) 
WHERE status = 'active' AND minutes_remaining > 0;

CREATE INDEX idx_credit_lots_expiry 
ON public.credit_lots (expires_at) 
WHERE status = 'active' AND minutes_remaining > 0;

CREATE INDEX idx_lot_consumptions_adjustment 
ON public.lot_consumptions (adjustment_ledger_entry_id) 
WHERE adjustment_ledger_entry_id IS NOT NULL;

CREATE INDEX idx_ledger_balance 
ON public.credit_ledger_entries (service_provider_id, organization_id, created_at);

CREATE INDEX idx_work_logs_provider_org 
ON public.work_logs (service_provider_id, organization_id, performed_at DESC);

CREATE INDEX idx_orders_provider_org 
ON public.orders (service_provider_id, organization_id, created_at DESC);

CREATE INDEX idx_provider_members_user 
ON public.provider_members (user_id);

CREATE INDEX idx_organization_members_user 
ON public.organization_members (user_id);

-- ============================================
-- APPEND-ONLY TRIGGERS
-- ============================================

-- Prevent updates/deletes on ledger entries
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger_entries is append-only. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_immutable
BEFORE UPDATE OR DELETE ON public.credit_ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_ledger_modification();

-- Prevent updates/deletes on audit events
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only. Updates and deletes are not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_immutable
BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_modification();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_providers_updated_at
BEFORE UPDATE ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_credit_bundles_updated_at
BEFORE UPDATE ON public.credit_bundles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();