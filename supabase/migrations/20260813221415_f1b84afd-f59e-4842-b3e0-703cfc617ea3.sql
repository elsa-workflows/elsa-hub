REVOKE INSERT ON public.products_public, public.credit_bundles_public, public.invitations_secure, public.runtime_grant_reconciliation FROM anon;
REVOKE SELECT ON public.invitations_secure, public.runtime_grant_reconciliation FROM anon;
REVOKE INSERT ON public.service_providers FROM anon;
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon;