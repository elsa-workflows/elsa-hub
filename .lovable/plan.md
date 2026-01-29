

# Fix Stripe Webhook Subscription Date Handling

## Problem Summary

A customer (`skywalkertdp+customer@gmail.com`) purchased the "Ongoing Advisory" subscription (€2,000/month), but the order doesn't appear in the system. The subscription exists in Stripe and is active, but the webhook failed to create records in Supabase.

### Root Cause

The `stripe-webhook` edge function uses Stripe API version `2025-08-27.basil`, which introduced a **breaking change**: the `current_period_start` and `current_period_end` fields were moved from the top-level Subscription object to the nested `items.data[]` array.

**Current code (broken):**
```typescript
const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
```

Since `subscription.current_period_start` is now `undefined`, this becomes:
```typescript
new Date(undefined * 1000).toISOString()  // RangeError: Invalid time value
```

## Solution

Update the webhook to extract period dates from the subscription items array instead of the top level.

### Changes Required

**File: `supabase/functions/stripe-webhook/index.ts`**

#### 1. Add helper function to safely extract period dates

```typescript
// Helper to extract period dates from subscription (handles API version differences)
function getSubscriptionPeriodDates(subscription: Stripe.Subscription): { periodStart: string; periodEnd: string } {
  // In API version 2025-08-27.basil, dates are on items, not top level
  const item = subscription.items?.data?.[0];
  
  const startTimestamp = item?.current_period_start ?? subscription.current_period_start;
  const endTimestamp = item?.current_period_end ?? subscription.current_period_end;
  
  if (!startTimestamp || !endTimestamp) {
    throw new Error("Missing period dates in subscription");
  }
  
  return {
    periodStart: new Date(startTimestamp * 1000).toISOString(),
    periodEnd: new Date(endTimestamp * 1000).toISOString(),
  };
}
```

#### 2. Update `handleSubscriptionCheckout` (around line 307-308)

**Before:**
```typescript
const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
```

**After:**
```typescript
const { periodStart, periodEnd } = getSubscriptionPeriodDates(subscription);
```

#### 3. Update `handleInvoicePaid` (around line 402, 416)

**Before:**
```typescript
const periodStart = new Date(invoice.period_start * 1000).toISOString();
// ...
const periodEnd = new Date(invoice.period_end * 1000).toISOString();
```

**After:**
```typescript
// Invoice period dates are still on the invoice object, but add null check
const periodStart = invoice.period_start 
  ? new Date(invoice.period_start * 1000).toISOString() 
  : new Date().toISOString();
const periodEnd = invoice.period_end 
  ? new Date(invoice.period_end * 1000).toISOString() 
  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
```

#### 4. Update `handleSubscriptionUpdated` (around line 450-451)

**Before:**
```typescript
current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
```

**After:**
```typescript
const { periodStart, periodEnd } = getSubscriptionPeriodDates(subscription);
// Then use periodStart and periodEnd in the update
```

## Manual Recovery Steps

After fixing the webhook, manually create the subscription record for the customer who already paid:

```sql
-- Create subscription record for existing Stripe subscription
INSERT INTO subscriptions (
  organization_id,
  service_provider_id,
  credit_bundle_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
) VALUES (
  'b22b8945-3364-45fb-a41c-19894dce4a07',  -- Customer org
  '11111111-1111-1111-1111-111111111111',  -- Skywalker Digital
  (SELECT id FROM credit_bundles WHERE stripe_price_id = 'price_1Sue2iR90AfIREKG7Ra1D17c'),
  'sub_1Sup6PR90AfIREKGp0yztMms',
  'cus_TsaGSjYHzlJv3a',
  'active',
  '2026-01-29T06:53:14Z',
  '2026-02-28T06:53:14Z',
  false
);
```

Then grant the initial credits via the `grantSubscriptionCredits` logic or manually.

## Implementation Order

1. Update the `stripe-webhook` edge function with the fix
2. Deploy the updated function
3. Run the SQL to create the missing subscription record
4. Grant initial credits for the first billing period
5. Test with a new subscription to verify the fix works

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/stripe-webhook/index.ts` | Add helper function, update 3 locations to use it |

## Verification

After deployment:
1. Check edge function logs for any new errors
2. Verify the subscription appears in the customer's dashboard
3. Test a new subscription purchase end-to-end

