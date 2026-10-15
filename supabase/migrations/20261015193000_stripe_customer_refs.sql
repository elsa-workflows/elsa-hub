-- Stripe customer identity for Hub checkout and portal.
-- One stored customer per organization and one per user. Not a column on
-- org_billing_profiles: that table already has admin INSERT/UPDATE for invoice
-- fields, and RLS cannot lock a single column. A dedicated table keeps writes
-- on service_role only and avoids creating empty billing profiles.
--
-- livemode is part of the owner unique key so a test customer and a live
-- customer for the same org or user never collide.

CREATE TABLE public.org_stripe_customers (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  livemode boolean NOT NULL,
  stripe_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, livemode),
  UNIQUE (stripe_customer_id),
  CONSTRAINT org_stripe_customers_stripe_customer_id_format
    CHECK (stripe_customer_id ~ '^cus_')
);

CREATE TABLE public.user_stripe_customers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  livemode boolean NOT NULL,
  stripe_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, livemode),
  UNIQUE (stripe_customer_id),
  CONSTRAINT user_stripe_customers_stripe_customer_id_format
    CHECK (stripe_customer_id ~ '^cus_')
);

COMMENT ON TABLE public.org_stripe_customers IS
  'Stripe customer id for organization purchases. Next to org_billing_profiles. Written by service_role only. Unique per (organization_id, livemode).';

COMMENT ON TABLE public.user_stripe_customers IS
  'Stripe customer id for personal purchases. Written by service_role only. Unique per (user_id, livemode).';

CREATE TRIGGER trg_org_stripe_customers_updated_at
BEFORE UPDATE ON public.org_stripe_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_stripe_customers_updated_at
BEFORE UPDATE ON public.user_stripe_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.org_stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stripe_customers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.org_stripe_customers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_stripe_customers FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.org_stripe_customers TO authenticated;
GRANT SELECT ON TABLE public.user_stripe_customers TO authenticated;
GRANT ALL ON TABLE public.org_stripe_customers TO service_role;
GRANT ALL ON TABLE public.user_stripe_customers TO service_role;

CREATE POLICY "Org admins can read org stripe customer refs"
ON public.org_stripe_customers
FOR SELECT
TO authenticated
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can read their own stripe customer refs"
ON public.user_stripe_customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
