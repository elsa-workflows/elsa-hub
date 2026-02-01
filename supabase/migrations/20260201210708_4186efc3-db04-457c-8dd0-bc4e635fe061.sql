-- Function to delete a user and ALL related data
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _sole_owner_org_ids UUID[];
  _all_org_ids UUID[];
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get organizations where user is sole owner (these will be deleted)
  SELECT ARRAY_AGG(om.organization_id) INTO _sole_owner_org_ids
  FROM organization_members om
  WHERE om.user_id = p_user_id 
    AND om.role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om2 
      WHERE om2.organization_id = om.organization_id 
        AND om2.user_id != p_user_id 
        AND om2.role = 'owner'
    );
  
  -- Get all orgs user is a member of
  SELECT ARRAY_AGG(organization_id) INTO _all_org_ids
  FROM organization_members WHERE user_id = p_user_id;

  -- Build result summary before deletion
  _result := jsonb_build_object(
    'user_id', p_user_id,
    'organizations_deleted', COALESCE(array_length(_sole_owner_org_ids, 1), 0),
    'memberships_removed', COALESCE(array_length(_all_org_ids, 1), 0)
  );

  -- PHASE 1: Deep child records
  DELETE FROM lot_consumptions WHERE work_log_id IN (
    SELECT id FROM work_logs WHERE organization_id = ANY(_sole_owner_org_ids)
  );
  DELETE FROM lot_consumptions WHERE credit_lot_id IN (
    SELECT id FROM credit_lots WHERE organization_id = ANY(_sole_owner_org_ids)
  );
  DELETE FROM audit_events WHERE organization_id = ANY(_sole_owner_org_ids) OR actor_user_id = p_user_id;
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM notification_preferences WHERE user_id = p_user_id;
  DELETE FROM unsubscribe_tokens WHERE user_id = p_user_id;
  DELETE FROM intro_call_requests WHERE user_id = p_user_id;

  -- PHASE 2: Financial/usage records for sole-owner orgs
  DELETE FROM work_logs WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM credit_ledger_entries WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM invoices WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM credit_lots WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM orders WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM subscriptions WHERE organization_id = ANY(_sole_owner_org_ids);

  -- PHASE 3: Invitations
  DELETE FROM invitations WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM invitations WHERE invited_by = p_user_id;

  -- PHASE 4: Memberships
  DELETE FROM provider_customers WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM organization_members WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM organization_members WHERE user_id = p_user_id;
  DELETE FROM provider_members WHERE user_id = p_user_id;
  DELETE FROM platform_admins WHERE user_id = p_user_id;

  -- PHASE 5: Organizations (sole-owner only)
  DELETE FROM organizations WHERE id = ANY(_sole_owner_org_ids);

  -- PHASE 6: User records
  DELETE FROM profiles WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN _result;
END;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;