
# Expert Services Credit System - Final Corrections

## Overview

This document incorporates three critical corrections to the implementation plan that prevent real-world failure modes:

1. **Lock key type correction** - `hashtext()` returns `INTEGER` (int4), not `BIGINT`
2. **service_role EXECUTE permission** - Required for external scheduling via REST RPC
3. **GitHub Actions headers** - Correct header pattern for Supabase REST API

---

## 1. Advisory Lock Type Correction

### Issue

The documentation incorrectly states that `hashtext()` produces a `BIGINT` lock key. In PostgreSQL, `hashtext()` returns `int4` (INTEGER).

### Corrections

**Documentation update:**

Replace:
> "produces a consistent BIGINT lock key..."

With:
> "produces a consistent INTEGER lock key (int4), which is used consistently across functions."

**Variable declaration in `process_expired_credit_lots`:**

```sql
DECLARE
  _lot RECORD;
  _lots_count INTEGER := 0;
  _minutes_count INTEGER := 0;
  _remaining_to_expire INTEGER;
  _lock_key INTEGER;  -- Correct: int4, not BIGINT
BEGIN
```

**Lock Key Consistency section update:**

```text
### Lock Key Formula

Both functions MUST use the identical lock key formula for mutual exclusion:

The formula `hashtext(provider_id::TEXT || ':' || org_id::TEXT)` returns an 
INTEGER lock key (int4) and must be used consistently across both work 
allocation and expiry processing.

-- In create_work_log_and_allocate:
PERFORM pg_advisory_xact_lock(
  hashtext(_provider_id::TEXT || ':' || _org_id::TEXT)
);

-- In process_expired_credit_lots:
_lock_key := hashtext(_lot.service_provider_id::TEXT || ':' || _lot.organization_id::TEXT);
PERFORM pg_advisory_xact_lock(_lock_key);
```

---

## 2. service_role EXECUTE Permission

### Issue

External scheduling via REST RPC (`/rest/v1/rpc/process_expired_credit_lots`) requires the executing database role to have `EXECUTE` permission. The service-role JWT maps to the PostgreSQL role `service_role`. Without granting execute to this role, external schedulers will receive 401/403 errors.

### Correction

**Updated RPC permission hardening:**

```sql
-- ============================================
-- process_expired_credit_lots: system/scheduler only
-- ============================================

-- Revoke from PUBLIC (no anonymous or general access)
REVOKE ALL ON FUNCTION public.process_expired_credit_lots() FROM PUBLIC;

-- Grant to service_role for external scheduling (GitHub Actions, admin edge functions)
GRANT EXECUTE ON FUNCTION public.process_expired_credit_lots() TO service_role;

-- Do NOT grant to authenticated users - this is system-only
```

**Documentation note:**

```text
### Permissions for process_expired_credit_lots

- REVOKED from PUBLIC: Prevents anonymous and general access
- GRANTED to service_role: Enables execution via:
  - pg_cron (runs as postgres superuser - always has access)
  - GitHub Actions using service role key
  - Admin edge functions using service role client
- NOT GRANTED to authenticated: End users cannot trigger expiry processing
```

---

## 3. GitHub Actions Headers Correction

### Issue

The example uses the service role key as both `apikey` and Bearer token. While this may work, it's non-standard and invites confusion. The correct pattern separates the keys by purpose.

### Correction

**Updated GitHub Actions workflow:**

```yaml
name: Process Expired Credits
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 02:00 UTC
  workflow_dispatch:  # Manual trigger

jobs:
  expire-credits:
    runs-on: ubuntu-latest
    steps:
      - name: Execute expiry function
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          curl -X POST "$SUPABASE_URL/rest/v1/rpc/process_expired_credit_lots" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "Content-Type: application/json"
```

**Security note to add:**

```text
### Header Pattern for Supabase REST API

- `apikey`: Use the anon key (identifies the project)
- `Authorization: Bearer`: Use the service role key (authenticates with elevated privileges)

CRITICAL: The service role key must NEVER be used client-side. It bypasses 
Row Level Security and has full database access. Store it only in secure 
server-side environments (CI/CD secrets, edge function secrets).
```

---

## 4. Complete Updated Permission SQL

Incorporating all corrections:

```sql
-- ============================================
-- RPC PERMISSION HARDENING (FINAL)
-- ============================================

-- create_work_log_and_allocate: authenticated users only
REVOKE ALL ON FUNCTION public.create_work_log_and_allocate(
  UUID, UUID, TIMESTAMPTZ, work_category, TEXT, INTEGER
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_work_log_and_allocate(
  UUID, UUID, TIMESTAMPTZ, work_category, TEXT, INTEGER
) TO authenticated;

-- create_credit_adjustment: authenticated users only
REVOKE ALL ON FUNCTION public.create_credit_adjustment(
  UUID, UUID, TEXT, INTEGER, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_credit_adjustment(
  UUID, UUID, TEXT, INTEGER, TEXT, TEXT
) TO authenticated;

-- get_credit_balance: authenticated users only
REVOKE ALL ON FUNCTION public.get_credit_balance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO authenticated;

-- process_expired_credit_lots: system/scheduler only
REVOKE ALL ON FUNCTION public.process_expired_credit_lots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_expired_credit_lots() TO service_role;
-- Do NOT grant to authenticated users
```

---

## 5. Updated process_expired_credit_lots Function

With correct variable type:

```sql
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
  _lock_key INTEGER;  -- CORRECTED: int4, not BIGINT
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

-- Apply permissions
REVOKE ALL ON FUNCTION public.process_expired_credit_lots() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_expired_credit_lots() TO service_role;
```

---

## 6. Optional Enhancement: Deterministic Invoice Timestamps

For production robustness, derive `paid_at` from the order rather than generating it fresh:

```typescript
// After updating order to paid, use the stored timestamp
const { data: updatedOrder } = await supabase
  .from("orders")
  .select("paid_at")
  .eq("id", orderId)
  .single();

const paidAt = updatedOrder?.paid_at || now;

// Invoice upsert with deterministic timestamp
await supabase
  .from("invoices")
  .upsert({
    service_provider_id: order.service_provider_id,
    organization_id: order.organization_id,
    order_id: orderId,
    stripe_receipt_url: receiptUrl,
    status: "paid",
    total_cents: order.amount_cents,
    currency: order.currency,
    issued_at: paidAt,  // From order, not fresh now()
    paid_at: paidAt,
  }, {
    onConflict: "order_id",
  });
```

This ensures multiple webhook deliveries don't cause timestamp drift.

---

## Summary of Corrections

| Issue | Fix |
|-------|-----|
| Lock key type | Changed `BIGINT` to `INTEGER` in docs and code |
| service_role permission | Added `GRANT EXECUTE ... TO service_role` |
| GitHub Actions headers | Use anon key for `apikey`, service role for `Authorization` |
| Invoice timestamps | Optional: derive from order.paid_at |

---

## Final Implementation Status

With these corrections applied, the Expert Services Credit System plan is production-ready for implementation. The plan now correctly handles:

- Type-safe advisory locking
- Proper role-based execution permissions
- Standard Supabase REST API authentication patterns
- Idempotent webhook processing with receipt retry
- Concurrency-safe credit allocation and expiry
- Complete audit trail for all credit movements
