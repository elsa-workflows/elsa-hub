-- Phase 1-3 Credit Safeguards Schema
-- All columns added upfront, disabled by default for progressive rollout

-- =============================================
-- SERVICE PROVIDERS - Add capacity management columns
-- =============================================

-- Phase 1: Manual intake pause (emergency brake)
ALTER TABLE service_providers 
  ADD COLUMN IF NOT EXISTS accepting_new_purchases BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS purchase_pause_message TEXT DEFAULT NULL;

-- Phase 2: Availability status indicator
ALTER TABLE service_providers
  ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS estimated_lead_time_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enforce_consumption_caps BOOLEAN NOT NULL DEFAULT false;

-- Phase 3: Capacity-aware sales gating
ALTER TABLE service_providers
  ADD COLUMN IF NOT EXISTS total_available_minutes_per_month INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS capacity_threshold_percent INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS enforce_capacity_gating BOOLEAN NOT NULL DEFAULT false;

-- Add check constraint for availability_status
ALTER TABLE service_providers
  ADD CONSTRAINT service_providers_availability_status_check 
  CHECK (availability_status IN ('available', 'limited', 'high_demand'));

-- =============================================
-- CREDIT BUNDLES - Add usage guidance columns
-- =============================================

-- Phase 1: Recommended monthly usage (soft guidance)
ALTER TABLE credit_bundles
  ADD COLUMN IF NOT EXISTS recommended_monthly_minutes INTEGER DEFAULT NULL;

-- Phase 2: Consumption caps and priority tiers
ALTER TABLE credit_bundles
  ADD COLUMN IF NOT EXISTS monthly_consumption_cap_minutes INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'standard';

-- Add check constraint for priority_level
ALTER TABLE credit_bundles
  ADD CONSTRAINT credit_bundles_priority_level_check 
  CHECK (priority_level IN ('standard', 'priority'));

-- =============================================
-- PHASE 3: Provider capacity metrics function
-- =============================================

CREATE OR REPLACE FUNCTION get_provider_capacity_metrics(p_provider_id UUID)
RETURNS TABLE(
  sold_unused_minutes INTEGER,
  recent_monthly_consumption INTEGER,
  projected_monthly_load INTEGER,
  total_capacity INTEGER,
  utilization_percent NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sold_unused INTEGER;
  _avg_consumption INTEGER;
  _total_capacity INTEGER;
BEGIN
  -- Get total sold but unused credits (active lots)
  SELECT COALESCE(SUM(minutes_remaining), 0)::INTEGER INTO _sold_unused
  FROM credit_lots
  WHERE service_provider_id = p_provider_id
    AND status = 'active';
  
  -- Get average monthly consumption over last 3 months
  SELECT COALESCE(AVG(monthly_total), 0)::INTEGER INTO _avg_consumption
  FROM (
    SELECT SUM(minutes_spent) as monthly_total
    FROM work_logs
    WHERE service_provider_id = p_provider_id
      AND performed_at >= date_trunc('month', now()) - interval '3 months'
    GROUP BY date_trunc('month', performed_at)
  ) monthly_totals;
  
  -- Get provider's total capacity
  SELECT total_available_minutes_per_month INTO _total_capacity
  FROM service_providers
  WHERE id = p_provider_id;
  
  RETURN QUERY SELECT
    _sold_unused as sold_unused_minutes,
    _avg_consumption as recent_monthly_consumption,
    (_sold_unused + _avg_consumption)::INTEGER as projected_monthly_load,
    _total_capacity as total_capacity,
    CASE 
      WHEN _total_capacity IS NULL OR _total_capacity = 0 THEN 0::NUMERIC
      ELSE ROUND(((_sold_unused + _avg_consumption)::NUMERIC / _total_capacity) * 100, 1)
    END as utilization_percent;
END;
$$;

-- Grant execute to authenticated users (provider members will use this)
GRANT EXECUTE ON FUNCTION get_provider_capacity_metrics(UUID) TO authenticated;

-- =============================================
-- PHASE 2: Update create_work_log_and_allocate RPC
-- Add consumption cap enforcement
-- =============================================

CREATE OR REPLACE FUNCTION public.create_work_log_and_allocate(
  p_provider_id uuid, 
  p_org_id uuid, 
  p_performed_at timestamp with time zone, 
  p_category work_category, 
  p_description text, 
  p_minutes integer
)
RETURNS uuid
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
  _enforce_caps BOOLEAN;
  _cap INTEGER;
  _monthly_used INTEGER;
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
  
  -- =============================================
  -- PHASE 2: Check monthly consumption cap if enforced
  -- =============================================
  SELECT enforce_consumption_caps INTO _enforce_caps
  FROM service_providers
  WHERE id = p_provider_id;
  
  IF _enforce_caps THEN
    -- Get applicable cap from the highest-priority active bundle
    SELECT cb.monthly_consumption_cap_minutes INTO _cap
    FROM credit_bundles cb
    JOIN credit_lots cl ON cl.service_provider_id = cb.service_provider_id
    WHERE cl.organization_id = p_org_id 
      AND cl.service_provider_id = p_provider_id
      AND cl.status = 'active'
      AND cb.monthly_consumption_cap_minutes IS NOT NULL
    ORDER BY 
      CASE WHEN cb.priority_level = 'priority' THEN 0 ELSE 1 END,
      cb.monthly_consumption_cap_minutes DESC
    LIMIT 1;
    
    IF _cap IS NOT NULL THEN
      -- Calculate current month usage
      SELECT COALESCE(SUM(minutes_spent), 0) INTO _monthly_used
      FROM work_logs
      WHERE organization_id = p_org_id
        AND service_provider_id = p_provider_id
        AND performed_at >= date_trunc('month', now())
        AND performed_at < date_trunc('month', now()) + interval '1 month';
      
      IF (_monthly_used + p_minutes) > _cap THEN
        RAISE EXCEPTION 'Monthly consumption cap exceeded. This organization has used % minutes this month (cap: % minutes). Please contact the provider.', 
          _monthly_used, _cap;
      END IF;
    END IF;
  END IF;
  -- =============================================
  
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

-- Ensure RPC security
REVOKE ALL ON FUNCTION create_work_log_and_allocate(UUID, UUID, TIMESTAMPTZ, work_category, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_work_log_and_allocate(UUID, UUID, TIMESTAMPTZ, work_category, TEXT, INTEGER) TO authenticated;

-- =============================================
-- Add comments for documentation
-- =============================================

COMMENT ON COLUMN service_providers.accepting_new_purchases IS 'Phase 1: Manual intake pause. When false, blocks new purchases.';
COMMENT ON COLUMN service_providers.purchase_pause_message IS 'Phase 1: Custom message shown when purchases are paused.';
COMMENT ON COLUMN service_providers.availability_status IS 'Phase 2: Current availability status (available, limited, high_demand).';
COMMENT ON COLUMN service_providers.estimated_lead_time_days IS 'Phase 2: Estimated days until service can begin.';
COMMENT ON COLUMN service_providers.enforce_consumption_caps IS 'Phase 2: When true, enforces monthly consumption caps.';
COMMENT ON COLUMN service_providers.total_available_minutes_per_month IS 'Phase 3: Provider total monthly capacity in minutes.';
COMMENT ON COLUMN service_providers.capacity_threshold_percent IS 'Phase 3: Percentage at which to block new sales (default 90).';
COMMENT ON COLUMN service_providers.enforce_capacity_gating IS 'Phase 3: When true, blocks sales at capacity threshold.';

COMMENT ON COLUMN credit_bundles.recommended_monthly_minutes IS 'Phase 1: Soft guidance for monthly usage.';
COMMENT ON COLUMN credit_bundles.monthly_consumption_cap_minutes IS 'Phase 2: Hard cap on monthly consumption.';
COMMENT ON COLUMN credit_bundles.priority_level IS 'Phase 2: Bundle priority tier (standard, priority).';