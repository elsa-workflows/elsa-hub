UPDATE public.registry_grants g
SET token_expires_at = s.current_period_end
FROM public.subscriptions s
WHERE s.id = g.subscription_id
  AND g.id = 'dddddddd-0000-4000-8000-000000000002';