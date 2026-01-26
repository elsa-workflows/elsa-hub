-- ============================================
-- EXPERT SERVICES CREDIT SYSTEM - PHASE 3: MAIN RPC FUNCTIONS
-- ============================================

-- Fix trigger functions to have search_path set
CREATE OR REPLACE FUNCTION public.prevent_ledger_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger_entries is append-only. Updates and deletes are not allowed.';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only. Updates and deletes are not allowed.';
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- get_credit_balance
-- Returns the current credit balance for an org with a provider
-- ============================================

CREATE OR REPLACE FUNCTION public.get_credit_balance(p_org_id UUID)
RETURNS TABLE (
  service_provider_id UUID,
  total_minutes INTEGER,
  used_minutes INTEGER,
  available_minutes INTEGER,
  expiring_soon_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.service_provider_id,
    COALESCE(SUM(cl.minutes_purchased)::INTEGER, 0) AS total_minutes,
    COALESCE(SUM(cl.minutes_purchased - cl.minutes_remaining)::INTEGER, 0) AS used_minutes,
    COALESCE(SUM(cl.minutes_remaining)::INTEGER, 0) AS available_minutes,
    COALESCE(SUM(
      CASE 
        WHEN cl.expires_at <= NOW() + INTERVAL '30 days' AND cl.status = 'active'
        THEN cl.minutes_remaining 
        ELSE 0 
      END
    )::INTEGER, 0) AS expiring_soon_minutes
  FROM credit_lots cl
  WHERE cl.organization_id = p_org_id
    AND cl.status IN ('active', 'exhausted')
  GROUP BY cl.service_provider_id;
END;
$$;

-- Grant to authenticated users
REVOKE ALL ON FUNCTION public.get_credit_balance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO authenticated;

-- ============================================
-- create_work_log_and_allocate
-- Creates work log and allocates credits using FIFO
-- ============================================

CREATE OR REPLACE FUNCTION public.create_work_log_and_allocate(
  p_provider_id UUID,
  p_org_id UUID,
  p_performed_at TIMESTAMPTZ,
  p_category work_category,
  p_description TEXT,
  p_minutes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _work_log_id UUID;
  _remaining_minutes INTEGER;
  _lot RECORD;
  _to_consume INTEGER;
  _ledger_id UUID;
BEGIN
  _user_id := auth.uid();
  
  -- Verify user is a provider member
  IF NOT is_provider_member(p_provider_id) THEN
    RAISE EXCEPTION 'User is not a member of this service provider';
  END IF;
  
  -- Verify org is a customer of this provider
  IF NOT EXISTS (
    SELECT 1 FROM provider_customers
    WHERE service_provider_id = p_provider_id
      AND organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Organization is not a customer of this provider';
  END IF;
  
  -- Acquire advisory lock for this provider-org pair
  PERFORM pg_advisory_xact_lock(
    hashtext(p_provider_id::TEXT || ':' || p_org_id::TEXT)
  );
  
  -- Create work log
  INSERT INTO work_logs (
    service_provider_id,
    organization_id,
    performed_by,
    performed_at,
    category,
    description,
    minutes_spent,
    is_billable,
    created_by
  ) VALUES (
    p_provider_id,
    p_org_id,
    _user_id,
    p_performed_at,
    p_category,
    p_description,
    p_minutes,
    true,
    _user_id
  ) RETURNING id INTO _work_log_id;
  
  -- Create ledger entry
  INSERT INTO credit_ledger_entries (
    service_provider_id,
    organization_id,
    entry_type,
    minutes_delta,
    reason_code,
    notes,
    related_work_log_id,
    actor_type,
    actor_user_id
  ) VALUES (
    p_provider_id,
    p_org_id,
    'debit',
    -p_minutes,
    'usage',
    p_description,
    _work_log_id,
    'user',
    _user_id
  ) RETURNING id INTO _ledger_id;
  
  -- FIFO allocation from active lots
  _remaining_minutes := p_minutes;
  
  FOR _lot IN
    SELECT id, minutes_remaining
    FROM credit_lots
    WHERE service_provider_id = p_provider_id
      AND organization_id = p_org_id
      AND status = 'active'
      AND minutes_remaining > 0
    ORDER BY expires_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN _remaining_minutes <= 0;
    
    _to_consume := LEAST(_lot.minutes_remaining, _remaining_minutes);
    
    -- Record consumption
    INSERT INTO lot_consumptions (
      credit_lot_id,
      work_log_id,
      minutes_consumed
    ) VALUES (
      _lot.id,
      _work_log_id,
      _to_consume
    );
    
    -- Update lot
    UPDATE credit_lots
    SET 
      minutes_remaining = minutes_remaining - _to_consume,
      status = CASE 
        WHEN minutes_remaining - _to_consume <= 0 THEN 'exhausted'::credit_lot_status
        ELSE status
      END
    WHERE id = _lot.id;
    
    _remaining_minutes := _remaining_minutes - _to_consume;
  END LOOP;
  
  -- If not enough credits, log warning but allow work to proceed
  IF _remaining_minutes > 0 THEN
    -- Could raise notice or handle deficit differently
    RAISE NOTICE 'Insufficient credits: % minutes remaining unallocated', _remaining_minutes;
  END IF;
  
  -- Create audit event
  INSERT INTO audit_events (
    service_provider_id,
    organization_id,
    actor_type,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    after_json
  ) VALUES (
    p_provider_id,
    p_org_id,
    'user',
    _user_id,
    'work_log',
    _work_log_id,
    'created',
    jsonb_build_object(
      'category', p_category,
      'minutes_spent', p_minutes,
      'description', p_description
    )
  );
  
  RETURN _work_log_id;
END;
$$;

-- Grant to authenticated users
REVOKE ALL ON FUNCTION public.create_work_log_and_allocate(UUID, UUID, TIMESTAMPTZ, work_category, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_work_log_and_allocate(UUID, UUID, TIMESTAMPTZ, work_category, TEXT, INTEGER) TO authenticated;

-- ============================================
-- create_credit_adjustment
-- Creates a manual credit adjustment (positive or negative)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_credit_adjustment(
  p_provider_id UUID,
  p_org_id UUID,
  p_adjustment_type TEXT,  -- 'credit' or 'debit'
  p_minutes INTEGER,
  p_reason_code TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _ledger_id UUID;
  _entry_type ledger_entry_type;
  _reason ledger_reason_code;
  _minutes_delta INTEGER;
  _remaining_minutes INTEGER;
  _lot RECORD;
  _to_consume INTEGER;
BEGIN
  _user_id := auth.uid();
  
  -- Verify user is a provider admin
  IF NOT is_provider_admin(p_provider_id) THEN
    RAISE EXCEPTION 'User is not an admin of this service provider';
  END IF;
  
  -- Validate adjustment type
  IF p_adjustment_type = 'credit' THEN
    _entry_type := 'credit';
    _minutes_delta := ABS(p_minutes);
  ELSIF p_adjustment_type = 'debit' THEN
    _entry_type := 'debit';
    _minutes_delta := -ABS(p_minutes);
  ELSE
    RAISE EXCEPTION 'Invalid adjustment type. Must be "credit" or "debit"';
  END IF;
  
  -- Validate reason code
  IF p_reason_code NOT IN ('adjustment', 'refund') THEN
    RAISE EXCEPTION 'Invalid reason code for adjustment. Must be "adjustment" or "refund"';
  END IF;
  _reason := p_reason_code::ledger_reason_code;
  
  -- Acquire advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext(p_provider_id::TEXT || ':' || p_org_id::TEXT)
  );
  
  -- Create ledger entry
  INSERT INTO credit_ledger_entries (
    service_provider_id,
    organization_id,
    entry_type,
    minutes_delta,
    reason_code,
    notes,
    actor_type,
    actor_user_id
  ) VALUES (
    p_provider_id,
    p_org_id,
    _entry_type,
    _minutes_delta,
    _reason,
    p_notes,
    'user',
    _user_id
  ) RETURNING id INTO _ledger_id;
  
  -- For debits, allocate from lots FIFO
  IF _entry_type = 'debit' THEN
    _remaining_minutes := ABS(_minutes_delta);
    
    FOR _lot IN
      SELECT id, minutes_remaining
      FROM credit_lots
      WHERE service_provider_id = p_provider_id
        AND organization_id = p_org_id
        AND status = 'active'
        AND minutes_remaining > 0
      ORDER BY expires_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN _remaining_minutes <= 0;
      
      _to_consume := LEAST(_lot.minutes_remaining, _remaining_minutes);
      
      INSERT INTO lot_consumptions (
        credit_lot_id,
        adjustment_ledger_entry_id,
        minutes_consumed
      ) VALUES (
        _lot.id,
        _ledger_id,
        _to_consume
      );
      
      UPDATE credit_lots
      SET 
        minutes_remaining = minutes_remaining - _to_consume,
        status = CASE 
          WHEN minutes_remaining - _to_consume <= 0 THEN 'exhausted'::credit_lot_status
          ELSE status
        END
      WHERE id = _lot.id;
      
      _remaining_minutes := _remaining_minutes - _to_consume;
    END LOOP;
  END IF;
  
  -- For credits (positive adjustments), we could create a new lot
  -- or just add to existing. For now, create a bonus lot.
  IF _entry_type = 'credit' THEN
    INSERT INTO credit_lots (
      service_provider_id,
      organization_id,
      minutes_purchased,
      minutes_remaining,
      expires_at,
      status
    ) VALUES (
      p_provider_id,
      p_org_id,
      _minutes_delta,
      _minutes_delta,
      NOW() + INTERVAL '24 months',
      'active'
    );
  END IF;
  
  -- Create audit event
  INSERT INTO audit_events (
    service_provider_id,
    organization_id,
    actor_type,
    actor_user_id,
    entity_type,
    entity_id,
    action,
    after_json
  ) VALUES (
    p_provider_id,
    p_org_id,
    'user',
    _user_id,
    'credit_adjustment',
    _ledger_id,
    'created',
    jsonb_build_object(
      'type', p_adjustment_type,
      'minutes', p_minutes,
      'reason', p_reason_code,
      'notes', p_notes
    )
  );
  
  RETURN _ledger_id;
END;
$$;

-- Grant to authenticated users
REVOKE ALL ON FUNCTION public.create_credit_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_credit_adjustment(UUID, UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- ============================================
-- process_expired_credit_lots
-- Daily job to expire credit lots past their validity
-- ============================================

CREATE OR REPLACE FUNCTION public.process_expired_credit_lots()
RETURNS TABLE (
  lots_expired INTEGER,
  total_minutes_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lot RECORD;
  _lots_count INTEGER := 0;
  _minutes_count INTEGER := 0;
  _remaining_to_expire INTEGER;
  _lock_key INTEGER;  -- hashtext returns int4
BEGIN
  FOR _lot IN
    SELECT 
      id, 
      service_provider_id, 
      organization_id, 
      minutes_remaining
    FROM credit_lots
    WHERE status = 'active'
      AND expires_at <= NOW()
      AND minutes_remaining > 0
    ORDER BY service_provider_id, organization_id, id
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Acquire advisory lock (INTEGER key from hashtext)
    _lock_key := hashtext(_lot.service_provider_id::TEXT || ':' || _lot.organization_id::TEXT);
    PERFORM pg_advisory_xact_lock(_lock_key);
    
    -- Re-check after lock
    SELECT minutes_remaining INTO _remaining_to_expire
    FROM credit_lots
    WHERE id = _lot.id
      AND status = 'active'
      AND minutes_remaining > 0
    FOR UPDATE;
    
    IF _remaining_to_expire IS NULL OR _remaining_to_expire <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Create ledger entry
    INSERT INTO credit_ledger_entries (
      service_provider_id,
      organization_id,
      entry_type,
      minutes_delta,
      reason_code,
      notes,
      related_credit_lot_id,
      actor_type
    ) VALUES (
      _lot.service_provider_id,
      _lot.organization_id,
      'debit',
      -_remaining_to_expire,
      'expiry',
      format('Credits expired after 24-month validity period. Lot ID: %s', _lot.id),
      _lot.id,
      'system'
    );
    
    -- Create audit event
    INSERT INTO audit_events (
      service_provider_id,
      organization_id,
      actor_type,
      entity_type,
      entity_id,
      action,
      before_json,
      after_json
    ) VALUES (
      _lot.service_provider_id,
      _lot.organization_id,
      'system',
      'credit_lot',
      _lot.id,
      'expired',
      jsonb_build_object('minutes_remaining', _remaining_to_expire, 'status', 'active'),
      jsonb_build_object('minutes_remaining', 0, 'status', 'expired')
    );
    
    -- Update lot
    UPDATE credit_lots
    SET minutes_remaining = 0, status = 'expired'
    WHERE id = _lot.id;
    
    _lots_count := _lots_count + 1;
    _minutes_count := _minutes_count + _remaining_to_expire;
  END LOOP;
  
  RETURN QUERY SELECT _lots_count, _minutes_count;
END;
$$;

-- Apply permissions - service_role only for external scheduling
REVOKE ALL ON FUNCTION public.process_expired_credit_lots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_expired_credit_lots() TO service_role;