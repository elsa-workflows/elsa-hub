-- Create org_billing_profiles table for invoice/billing information
CREATE TABLE public.org_billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Company identification
  company_legal_name TEXT,
  registration_number TEXT,  -- Chamber of Commerce / Company Registration
  vat_number TEXT,           -- VAT/Tax ID
  
  -- Billing address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country TEXT,              -- ISO 3166-1 alpha-2 country code
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.org_billing_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only org admins can access billing profiles
CREATE POLICY "Org admins can view billing profile"
  ON public.org_billing_profiles FOR SELECT
  USING (is_org_admin(organization_id));

CREATE POLICY "Org admins can insert billing profile"
  ON public.org_billing_profiles FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Org admins can update billing profile"
  ON public.org_billing_profiles FOR UPDATE
  USING (is_org_admin(organization_id))
  WITH CHECK (is_org_admin(organization_id));

-- Trigger for automatic updated_at
CREATE TRIGGER update_org_billing_profiles_updated_at
  BEFORE UPDATE ON public.org_billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_org_billing_profiles_org_id ON public.org_billing_profiles(organization_id);