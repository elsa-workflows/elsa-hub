# Credit Safeguards Implementation Plan

## Status: ✅ Phase 1-3 Implemented

This plan implements a phased safeguard system to prevent over-selling and over-consuming service credits. The architecture is designed so Phase 1 can be deployed immediately, with later phases activated via configuration flags without requiring schema redesign.

## Architecture Principles

- **Progressive enforcement**: Start with transparency, escalate to soft limits, then hard limits
- **Provider-controlled switches**: Emergency brakes and toggles accessible to provider admins
- **No silent failures**: Always explain why an action is blocked
- **Schema forward-compatible**: All phase fields added upfront, enabled via flags

---

## Phase 1 - Expectation Management + Soft Controls ✅ IMPLEMENTED

### Database Schema ✅
- `service_providers.accepting_new_purchases` (boolean, default true)
- `service_providers.purchase_pause_message` (text, optional)
- `credit_bundles.recommended_monthly_minutes` (integer, optional)

### 1.1 Availability Disclaimers ✅
- Added `AvailabilityDisclaimer` component in `src/components/enterprise/`
- Displayed in:
  - ExpertServices page (Service Credits section)
  - PurchaseBundleDialog (before checkout button)

### 1.2 Recommended Monthly Usage ✅
- Bundle cards show "Recommended: Xh/month" when configured
- `useCreditBundles` hook updated to fetch `recommended_monthly_minutes`

### 1.3 Manual Intake Pause ✅
- Provider Settings UI with toggle switch
- Edge function `create-checkout-session` checks `accepting_new_purchases`
- Returns 503 with custom message when paused

---

## Phase 2 - Consumption Rate Controls + Visibility ✅ IMPLEMENTED

### Database Schema ✅
- `credit_bundles.monthly_consumption_cap_minutes` (integer, optional)
- `credit_bundles.priority_level` (text: 'standard' | 'priority')
- `service_providers.availability_status` (text: 'available' | 'limited' | 'high_demand')
- `service_providers.estimated_lead_time_days` (integer, optional)
- `service_providers.enforce_consumption_caps` (boolean, default false)

### 2.4 Monthly Consumption Caps ✅
- `create_work_log_and_allocate` RPC updated with cap enforcement
- Only enforced when `enforce_consumption_caps = true`
- Clear error messages when cap exceeded

### 2.5 Availability Status Indicator ✅
- `AvailabilityStatusBadge` component created
- Ready to display on product pages when status is set

### 2.6 Usage Pacing Transparency ✅
- `UsagePacingCard` component added to OrgCredits dashboard
- Shows current month usage vs recommended limit
- Color-coded progress bar (green → yellow → red)
- Warning messages when approaching or exceeding limits

---

## Phase 3 - Supply-Aware Sales Gating ✅ IMPLEMENTED (Disabled by Default)

### Database Schema ✅
- `service_providers.total_available_minutes_per_month` (integer, optional)
- `service_providers.capacity_threshold_percent` (integer, default 90)
- `service_providers.enforce_capacity_gating` (boolean, default false)

### 3.7 Provider Capacity Model ✅
- `get_provider_capacity_metrics` RPC function created
- Calculates:
  - `sold_unused_minutes` - total remaining credits across active lots
  - `recent_monthly_consumption` - 3-month average
  - `projected_monthly_load` - combined metric
  - `utilization_percent` - against total capacity

### 3.8 Capacity-Aware Checkout Guard ✅
- Implemented in `create-checkout-session` edge function
- Only active when `enforce_capacity_gating = true`
- Returns 503 when utilization exceeds threshold

### 3.9 Tiered Availability by Bundle ✅
- `priority_level` column added to credit_bundles
- Priority bundles get higher caps in consumption logic

---

## Phase 4 - Structural Scaling (Documentation Only)

### 4.10 Multi-Provider Routing Readiness ✅
Current architecture already supports:
- Provider-scoped credit pools
- Orders track `service_provider_id`
- New providers can be added manually

### 4.11 Temporary Throttling and Recovery
Provider Settings UI already supports:
- Toggle intake pause
- Custom pause messages
- All reversible without affecting credits

---

## Configuration Flags Summary

| Flag | Location | Default | Purpose |
|------|----------|---------|---------|
| `accepting_new_purchases` | service_providers | true | Manual intake pause |
| `enforce_consumption_caps` | service_providers | false | Enable Phase 2 caps |
| `enforce_capacity_gating` | service_providers | false | Enable Phase 3 sales guard |

---

## Files Modified

### Components Created
- `src/components/enterprise/AvailabilityDisclaimer.tsx`
- `src/components/enterprise/AvailabilityStatusBadge.tsx`
- `src/components/organization/UsagePacingCard.tsx`

### Components Updated
- `src/pages/enterprise/ExpertServices.tsx` - Disclaimers + recommended usage
- `src/components/organization/PurchaseBundleDialog.tsx` - Disclaimer before checkout
- `src/pages/dashboard/org/OrgCredits.tsx` - Usage pacing card
- `src/pages/dashboard/provider/ProviderSettings.tsx` - Intake pause toggle

### Hooks Updated
- `src/hooks/useCreditBundles.ts` - New safeguard fields
- `src/hooks/useProviderDashboard.ts` - Provider settings fields

### Edge Functions Updated
- `supabase/functions/create-checkout-session/index.ts` - Phase 1 + 3 guards

### Database
- Migration added all Phase 1-3 columns
- `create_work_log_and_allocate` RPC updated for Phase 2 caps
- `get_provider_capacity_metrics` function added for Phase 3

---

## Enabling Features

### To Enable Phase 2 Consumption Caps:
```sql
UPDATE service_providers 
SET enforce_consumption_caps = true 
WHERE slug = 'skywalker-digital';
```

### To Enable Phase 3 Capacity Gating:
```sql
UPDATE service_providers 
SET enforce_capacity_gating = true,
    total_available_minutes_per_month = 2400  -- 40 hours
WHERE slug = 'skywalker-digital';
```

### To Set Recommended Usage on Bundles:
```sql
UPDATE credit_bundles 
SET recommended_monthly_minutes = 120  -- 2 hours/month
WHERE name = 'Starter Pack';
```
