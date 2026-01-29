
# Credit Safeguards Implementation Plan

## Overview

This plan implements a phased safeguard system to prevent over-selling and over-consuming service credits. The architecture is designed so Phase 1 can be deployed immediately, with later phases activated via configuration flags without requiring schema redesign.

## Architecture Principles

- **Progressive enforcement**: Start with transparency, escalate to soft limits, then hard limits
- **Provider-controlled switches**: Emergency brakes and toggles accessible to provider admins
- **No silent failures**: Always explain why an action is blocked
- **Schema forward-compatible**: All phase fields added upfront, enabled via flags

---

## Phase 1 - Expectation Management + Soft Controls (Immediate)

### Database Schema Changes

Add columns to `service_providers`:
```sql
ALTER TABLE service_providers ADD COLUMN
  accepting_new_purchases BOOLEAN NOT NULL DEFAULT true,
  purchase_pause_message TEXT DEFAULT NULL;
```

Add columns to `credit_bundles`:
```sql
ALTER TABLE credit_bundles ADD COLUMN
  recommended_monthly_minutes INTEGER DEFAULT NULL;
```

### 1.1 Availability Disclaimers

**Files to modify:**
- `src/pages/enterprise/ExpertServices.tsx` - Add disclaimer text in Service Credits section
- `src/components/organization/PurchaseBundleDialog.tsx` - Show disclaimer before checkout button
- Invoice/receipt display (if applicable)

**UI Implementation:**
- Add an info callout in the "How Engagement Works" section:
  > "Service credits represent prepaid access to professional services. Credits do not guarantee immediate availability — scheduling is subject to provider capacity."
- Add same text as footnote in checkout dialog before "Continue to Payment" button

### 1.2 Recommended Monthly Usage (Soft Guidance)

**Database:**
- `credit_bundles.recommended_monthly_minutes` - Optional field

**Frontend changes:**
- `src/pages/enterprise/ExpertServices.tsx` - Display "Recommended: Xh/month" on bundle cards where defined
- `src/pages/dashboard/org/OrgCredits.tsx` - Calculate current month's usage from work_logs and display warning if exceeded

**Current month usage query:**
```sql
SELECT COALESCE(SUM(minutes_spent), 0) as monthly_usage
FROM work_logs
WHERE organization_id = $org_id
  AND performed_at >= date_trunc('month', now())
  AND performed_at < date_trunc('month', now()) + interval '1 month';
```

**Warning component:**
If `monthly_usage > recommended_monthly_minutes` (from active lots' bundles), show:
> "You've exceeded the recommended monthly usage (Xh). Scheduling may be affected."

### 1.3 Manual Intake Pause (Emergency Brake)

**Database:**
- `service_providers.accepting_new_purchases` (boolean, default true)
- `service_providers.purchase_pause_message` (text, optional custom message)

**Edge function changes (`create-checkout-session/index.ts`):**
Before creating Stripe session, check:
```typescript
const { data: provider } = await serviceClient
  .from("service_providers")
  .select("accepting_new_purchases, purchase_pause_message")
  .eq("id", bundle.service_provider_id)
  .single();

if (!provider?.accepting_new_purchases) {
  return new Response(
    JSON.stringify({ 
      error: provider.purchase_pause_message || 
        "We're temporarily limiting new purchases to ensure quality and availability." 
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**Provider Settings UI (`src/pages/dashboard/provider/ProviderSettings.tsx`):**
Add toggle card for admins:
- Switch for "Accepting new purchases"
- Optional textarea for custom pause message
- When toggled off, show warning that customers won't be able to purchase

---

## Phase 2 - Consumption Rate Controls + Visibility

### Database Schema Changes

Add columns to `credit_bundles`:
```sql
ALTER TABLE credit_bundles ADD COLUMN
  monthly_consumption_cap_minutes INTEGER DEFAULT NULL,
  priority_level TEXT DEFAULT 'standard' CHECK (priority_level IN ('standard', 'priority'));
```

Add columns to `service_providers`:
```sql
ALTER TABLE service_providers ADD COLUMN
  availability_status TEXT DEFAULT 'available' 
    CHECK (availability_status IN ('available', 'limited', 'high_demand')),
  estimated_lead_time_days INTEGER DEFAULT NULL,
  enforce_consumption_caps BOOLEAN NOT NULL DEFAULT false;
```

### 2.4 Monthly Consumption Caps

**RPC function update (`create_work_log_and_allocate`):**
Add consumption cap check before creating work log:

```sql
-- Check monthly consumption cap if enforced
IF (SELECT enforce_consumption_caps FROM service_providers WHERE id = p_provider_id) THEN
  -- Get applicable cap from active subscription or bundle
  SELECT monthly_consumption_cap_minutes INTO _cap
  FROM credit_bundles cb
  JOIN credit_lots cl ON cl.order_id IS NOT NULL 
    AND cl.organization_id = p_org_id 
    AND cl.service_provider_id = p_provider_id
  WHERE cl.status = 'active'
  ORDER BY cb.priority_level = 'priority' DESC, cb.monthly_consumption_cap_minutes DESC NULLS LAST
  LIMIT 1;
  
  IF _cap IS NOT NULL THEN
    -- Calculate current month usage
    SELECT COALESCE(SUM(minutes_spent), 0) INTO _monthly_used
    FROM work_logs
    WHERE organization_id = p_org_id
      AND service_provider_id = p_provider_id
      AND performed_at >= date_trunc('month', now());
    
    IF (_monthly_used + p_minutes) > _cap THEN
      RAISE EXCEPTION 'Monthly consumption cap exceeded. Used: % min, Cap: % min, Requested: % min',
        _monthly_used, _cap, p_minutes;
    END IF;
  END IF;
END IF;
```

### 2.5 Availability Status Indicator

**Frontend changes:**
- `src/pages/enterprise/ExpertServices.tsx` - Display badge based on provider status
- `src/pages/dashboard/org/OrgCredits.tsx` - Show provider availability in header

**Display logic:**
```text
available -> no badge
limited -> yellow badge "Limited Availability"
high_demand -> orange badge "High Demand - X day lead time"
```

### 2.6 Usage Pacing Transparency

**Frontend (`src/pages/dashboard/org/OrgCredits.tsx`):**
Add new card showing:
- Current month usage (from work_logs)
- Recommended maximum (from bundle)
- Progress bar with color coding

```text
"3h used this month · Recommended max: 5h"
[=======     ] 60%
```

Color coding:
- Green: <75% of recommended
- Yellow: 75-100% of recommended
- Orange: >100% of recommended

---

## Phase 3 - Supply-Aware Sales Gating

### Database Schema Changes

Add columns to `service_providers`:
```sql
ALTER TABLE service_providers ADD COLUMN
  total_available_minutes_per_month INTEGER DEFAULT NULL,
  capacity_threshold_percent INTEGER DEFAULT 90,
  enforce_capacity_gating BOOLEAN NOT NULL DEFAULT false;
```

### 3.7 Provider Capacity Model

**New database function:**
```sql
CREATE FUNCTION get_provider_capacity_metrics(p_provider_id UUID)
RETURNS TABLE(
  sold_unused_minutes INTEGER,
  recent_monthly_consumption INTEGER,
  projected_monthly_load INTEGER,
  total_capacity INTEGER,
  utilization_percent NUMERIC
)
```

This calculates:
- Total sold but unused credits (sum of `minutes_remaining` from active lots)
- Average consumption over last 3 months
- Projected load = sold unused + (avg monthly consumption * factor)
- Utilization = projected load / total_available_minutes_per_month

### 3.8 Capacity-Aware Checkout Guard

**Edge function (`create-checkout-session/index.ts`):**
```typescript
// Only if capacity gating is enabled
const { data: provider } = await serviceClient
  .from("service_providers")
  .select("enforce_capacity_gating, total_available_minutes_per_month, capacity_threshold_percent")
  .eq("id", bundle.service_provider_id)
  .single();

if (provider?.enforce_capacity_gating && provider.total_available_minutes_per_month) {
  const { data: metrics } = await serviceClient.rpc("get_provider_capacity_metrics", {
    p_provider_id: bundle.service_provider_id
  });
  
  if (metrics?.utilization_percent >= provider.capacity_threshold_percent) {
    return new Response(
      JSON.stringify({ 
        error: "We're currently at capacity. Please contact us to discuss availability." 
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
```

### 3.9 Tiered Availability by Bundle

Already handled via `priority_level` column:
- Standard bundles: subject to all caps
- Priority bundles: higher caps, bypass some soft limits

---

## Phase 4 - Structural Scaling (Long-term)

### 4.10 Multi-Provider Routing Readiness

Current architecture already supports this:
- Credits are provider-scoped via `service_provider_id`
- Orders track `service_provider_id`
- New providers can be added via admin

**Future enhancements (documentation only, no implementation now):**
- Customer chooses provider at checkout
- Load balancing across providers

### 4.11 Temporary Throttling and Recovery

**Provider Settings UI enhancements:**
- Ability to temporarily reduce caps per bundle
- Pause individual bundles without deactivating
- All actions reversible without affecting existing credits

---

## File Change Summary

| File | Changes |
|------|---------|
| `supabase/migrations/xxx.sql` | Add new columns to `service_providers` and `credit_bundles` |
| `src/integrations/supabase/types.ts` | Auto-generated after migration |
| `supabase/functions/create-checkout-session/index.ts` | Add intake pause check, capacity guard (Phase 3) |
| `src/pages/enterprise/ExpertServices.tsx` | Add disclaimer, recommended usage display, availability badge |
| `src/components/organization/PurchaseBundleDialog.tsx` | Add disclaimer before checkout |
| `src/pages/dashboard/org/OrgCredits.tsx` | Add monthly usage tracking, pacing transparency |
| `src/pages/dashboard/provider/ProviderSettings.tsx` | Add intake pause toggle, availability controls |
| `src/pages/dashboard/provider/ProviderBundles.tsx` | Add recommended usage and cap editing |
| `supabase/migrations/xxx.sql` | Update `create_work_log_and_allocate` RPC for consumption caps |

---

## Implementation Order

1. **Migration**: Add all schema columns for Phase 1-3 (disabled by default)
2. **Phase 1 UI**: Disclaimers + recommended usage display + pause toggle
3. **Phase 1 Backend**: Intake pause check in checkout edge function
4. **Phase 2 UI**: Availability status + pacing transparency
5. **Phase 2 Backend**: Consumption cap enforcement in RPC
6. **Phase 3 Backend**: Capacity metrics function + checkout guard
7. **Phase 3 UI**: Provider capacity dashboard (if needed)

---

## Configuration Flags Summary

| Flag | Location | Default | Purpose |
|------|----------|---------|---------|
| `accepting_new_purchases` | service_providers | true | Manual intake pause |
| `enforce_consumption_caps` | service_providers | false | Enable Phase 2 caps |
| `enforce_capacity_gating` | service_providers | false | Enable Phase 3 sales guard |

This allows progressive rollout: start with Phase 1, flip flags to enable Phase 2/3 as needed.
