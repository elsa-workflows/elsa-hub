CREATE OR REPLACE VIEW public.runtime_grant_reconciliation
WITH (security_invoker = true) AS
 SELECT s.id AS subscription_id,
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
   FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     JOIN organizations o ON o.id = s.organization_id
     LEFT JOIN registry_grants g ON g.subscription_id = s.id AND g.status = 'active'::registry_grant_status
  WHERE p.kind = 'runtime_subscription'::product_kind AND s.status = 'active'::text AND g.id IS NULL
UNION ALL
 SELECT s.id AS subscription_id,
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
    'needs_revoke'::text AS reason
   FROM registry_grants g
     JOIN subscriptions s ON s.id = g.subscription_id
     JOIN products p ON p.id = s.product_id
     JOIN organizations o ON o.id = s.organization_id
  WHERE g.status = 'active'::registry_grant_status AND (s.status = 'canceled'::text OR s.status <> 'active'::text AND s.current_period_end IS NOT NULL AND s.current_period_end < (now() - '30 days'::interval))
UNION ALL
 SELECT s.id AS subscription_id,
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
    'expiry_drift'::text AS reason
   FROM registry_grants g
     JOIN subscriptions s ON s.id = g.subscription_id
     JOIN products p ON p.id = s.product_id
     JOIN organizations o ON o.id = s.organization_id
  WHERE g.status = 'active'::registry_grant_status AND g.token_expires_at IS NOT NULL AND s.current_period_end IS NOT NULL AND g.token_expires_at > s.current_period_end
UNION ALL
 SELECT s.id AS subscription_id,
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
    'needs_reissue'::text AS reason
   FROM registry_grants g
     JOIN subscriptions s ON s.id = g.subscription_id
     JOIN products p ON p.id = s.product_id
     JOIN organizations o ON o.id = s.organization_id
  WHERE g.status = 'active'::registry_grant_status
    AND s.status = 'active'::text
    AND g.token_expires_at IS NOT NULL
    AND s.current_period_end IS NOT NULL
    AND g.token_expires_at < s.current_period_end;