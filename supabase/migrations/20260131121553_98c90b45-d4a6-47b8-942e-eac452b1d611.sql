-- Create RPC function for organization-scoped audit events
CREATE OR REPLACE FUNCTION public.get_org_audit_events(
  p_org_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  actor_type actor_type,
  actor_display_name TEXT,
  entity_type TEXT,
  action TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is org admin
  IF NOT is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Access denied: Organization admin required';
  END IF;

  RETURN QUERY
  SELECT 
    ae.id,
    ae.actor_type,
    CASE 
      WHEN ae.actor_type = 'system' THEN 'System'::TEXT
      ELSE COALESCE(p.display_name, p.email, 'Unknown user')
    END as actor_display_name,
    ae.entity_type,
    ae.action,
    -- Generate human-readable summary from after_json
    CASE ae.entity_type
      WHEN 'work_log' THEN 
        format('Logged %s minutes of %s work: %s',
          COALESCE((ae.after_json->>'minutes_spent')::TEXT, '?'),
          COALESCE(ae.after_json->>'category', 'general'),
          COALESCE(LEFT(ae.after_json->>'description', 100), '')
        )
      WHEN 'order' THEN 
        format('Order %s - $%s',
          ae.action,
          COALESCE(((ae.after_json->>'amount_cents')::INTEGER / 100.0)::TEXT, '?')
        )
      WHEN 'credit_lot' THEN 
        CASE ae.action
          WHEN 'expired' THEN format('%s minutes expired', COALESCE((ae.before_json->>'minutes_remaining')::TEXT, '?'))
          ELSE format('Credit lot %s', ae.action)
        END
      WHEN 'credit_adjustment' THEN 
        format('%s adjustment of %s minutes: %s',
          COALESCE(ae.after_json->>'type', 'Credit'),
          COALESCE((ae.after_json->>'minutes')::TEXT, '?'),
          COALESCE(ae.after_json->>'notes', '')
        )
      WHEN 'subscription' THEN 
        format('Subscription %s', ae.action)
      WHEN 'invitation' THEN
        format('Invitation %s', ae.action)
      WHEN 'organization_member' THEN
        format('Team member %s', ae.action)
      ELSE format('%s %s', REPLACE(ae.entity_type, '_', ' '), ae.action)
    END as summary,
    ae.created_at
  FROM audit_events ae
  LEFT JOIN profiles p ON p.user_id = ae.actor_user_id
  WHERE ae.organization_id = p_org_id
    AND (p_entity_type IS NULL OR ae.entity_type = p_entity_type)
  ORDER BY ae.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users (function handles its own access control)
GRANT EXECUTE ON FUNCTION public.get_org_audit_events TO authenticated;