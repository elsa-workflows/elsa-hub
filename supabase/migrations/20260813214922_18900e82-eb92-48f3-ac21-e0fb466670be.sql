CREATE TABLE public.subscription_renewal_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_end timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period_end)
);

GRANT ALL ON public.subscription_renewal_notices TO service_role;
GRANT SELECT ON public.subscription_renewal_notices TO authenticated;

ALTER TABLE public.subscription_renewal_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view renewal notices"
ON public.subscription_renewal_notices
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Provider admins can view renewal notices"
ON public.subscription_renewal_notices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_renewal_notices.subscription_id
      AND public.is_provider_admin(s.service_provider_id)
  )
);

CREATE INDEX idx_subscription_renewal_notices_subscription
  ON public.subscription_renewal_notices (subscription_id, period_end DESC);