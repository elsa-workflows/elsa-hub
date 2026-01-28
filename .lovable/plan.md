

# Plan: Activate Ongoing Advisory Subscription Bundle

## Overview

Transform the static "Ongoing Advisory" section on the Expert Services page into a purchasable recurring subscription product at €2,000/month with 6 hours of credits granted each billing cycle.

## Current State

- **One-time purchases work**: Users can click bundle cards, open purchase dialog, and complete Stripe Checkout
- **Ongoing Advisory section**: Currently static display with no purchase functionality
- **Database**: `credit_bundles` table only supports one-time purchases (has `hours` column but no recurring billing fields)

## New Subscription Flow

```text
User clicks "Subscribe":
  1. PurchaseBundleDialog opens with subscription bundle
  2. create-checkout-session detects billing_type = 'recurring'
  3. Stripe Checkout opens in subscription mode
  4. User completes payment

checkout.session.completed (subscription):
  5. Create subscription record in new subscriptions table
  6. Create first month's credit lot (6 hours)
  7. Create ledger entry (reason: subscription_credit)

Each month (invoice.paid):
  8. Verify subscription is active
  9. Create new credit lot for the period
  10. Update subscription period dates
```

## Implementation Steps

### Step 1: Database Schema Changes

**New `billing_type` enum:**
- `one_time` (default for existing bundles)
- `recurring` (for subscriptions)

**Modify `credit_bundles` table:**
| Column | Type | Description |
|--------|------|-------------|
| `billing_type` | ENUM | `one_time` or `recurring` |
| `recurring_interval` | TEXT | `month`, `year`, etc. (null for one_time) |
| `monthly_hours` | INTEGER | Hours granted each month (for recurring) |

Note: The existing `hours` column remains for one-time bundles; `monthly_hours` is used for recurring bundles.

**New `subscriptions` table:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `service_provider_id` | UUID | FK to service_providers |
| `credit_bundle_id` | UUID | FK to credit_bundles |
| `stripe_subscription_id` | TEXT | Stripe subscription ID (unique) |
| `stripe_customer_id` | TEXT | Stripe customer ID |
| `status` | TEXT | active, canceled, past_due, paused |
| `current_period_start` | TIMESTAMPTZ | Current billing period start |
| `current_period_end` | TIMESTAMPTZ | Current billing period end |
| `cancel_at_period_end` | BOOLEAN | Will cancel at period end |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last update |

**Modify `credit_lots` table:**
- Add `subscription_id` column (FK to subscriptions, nullable)
- Add `billing_period_start` column for tracking which period the credits belong to

**Add `subscription_credit` to `ledger_reason_code` enum**

**RLS policies for subscriptions:**
- Org members can SELECT their subscriptions
- Provider members can SELECT customer subscriptions
- No INSERT/UPDATE/DELETE from client (service role only)

**Insert Ongoing Advisory bundle:**
```sql
INSERT INTO credit_bundles (
  service_provider_id, name, description, billing_type, 
  recurring_interval, monthly_hours, price_cents, currency, 
  stripe_price_id, is_active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Ongoing Advisory',
  '6 hours per month, priority scheduling, and async Q&A access',
  'recurring',
  'month',
  6,
  200000,
  'eur',
  NULL, -- Set after Stripe product creation
  true
);
```

### Step 2: Create Stripe Subscription Product

Use Stripe tools to create:
- **Product**: Ongoing Advisory
- **Price**: €2,000/month (200000 cents EUR, recurring monthly)

Then update the bundle's `stripe_price_id` with the new price ID.

### Step 3: Update Edge Functions

**create-checkout-session/index.ts changes:**
1. Fetch `billing_type` and `monthly_hours` from bundle
2. Determine `mode`: `"subscription"` for recurring, `"payment"` for one_time
3. For subscriptions:
   - Get or create Stripe customer for the organization
   - Store customer ID in metadata
4. Create Stripe Checkout session with appropriate mode
5. Return checkout URL

Key code changes:
```typescript
const mode = bundle.billing_type === 'recurring' ? 'subscription' : 'payment';

// For subscriptions, get/create Stripe customer
let customerId: string | undefined;
if (mode === 'subscription') {
  // Look up org admin's email, find or create Stripe customer
}

const session = await stripe.checkout.sessions.create({
  mode,
  customer: customerId,
  line_items: [{ price: bundle.stripe_price_id, quantity: 1 }],
  metadata: { order_id, organization_id, service_provider_id, bundle_id, billing_type },
  // ...
});
```

**stripe-webhook/index.ts changes:**
Add handlers for subscription events:

| Event | Action |
|-------|--------|
| `checkout.session.completed` (mode=subscription) | Create subscription record, grant first month's credits (6 hours, 24-month expiry) |
| `invoice.paid` (for subscription renewals) | Grant monthly credits for the new billing period |
| `customer.subscription.updated` | Update subscription status, handle cancellations |
| `customer.subscription.deleted` | Mark subscription as canceled |

The webhook must distinguish between one-time payment completions (existing logic) and subscription completions (new logic).

**New customer-portal/index.ts function:**
Create an edge function that generates Stripe Customer Portal sessions so users can manage their subscriptions (cancel, update payment method).

### Step 4: Update Frontend Hooks

**Modify useCreditBundles.ts:**
- Add `billing_type`, `recurring_interval`, `monthly_hours` to the query and interface

**New useSubscriptions.ts hook:**
- Fetch active subscriptions for an organization
- Return subscription status, renewal date, bundle info

### Step 5: Update Frontend Components

**ExpertServices.tsx:**
- Include `billing_type` in the bundles query
- Make the Ongoing Advisory card clickable (like one-time bundles)
- Show "Subscribe" instead of a one-time price for recurring bundles
- Pass the bundle ID to PurchaseBundleDialog when clicked

**PurchaseBundleDialog.tsx:**
- Display both one-time and recurring bundles in the selection list
- Show "€2,000/month" and "Subscribe" for recurring bundles
- Show "6 hours per month" instead of total hours for recurring
- Change button text to "Subscribe" for recurring bundles

**OrganizationDashboard.tsx:**
- Add new "Active Subscriptions" card section
- Display subscription status, next renewal date, monthly hours
- Add "Manage Subscription" button linking to Stripe Customer Portal

**New SubscriptionCard.tsx component:**
- Display subscription details (bundle name, status, renewal date)
- Show visual indicator for status (active = green, past_due = yellow, canceled = gray)
- "Manage Subscription" button (only for admins)

### Step 6: Webhook Events Configuration

Ensure these events are configured in the Stripe webhook:
- `checkout.session.completed` (already configured)
- `checkout.session.expired` (already configured)
- `invoice.paid` (new - for subscription renewals)
- `customer.subscription.updated` (new - for status changes)
- `customer.subscription.deleted` (new - for cancellations)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | Schema changes: enum, subscriptions table, alter credit_bundles/credit_lots |
| `supabase/functions/create-checkout-session/index.ts` | Modify | Support subscription mode, customer management |
| `supabase/functions/stripe-webhook/index.ts` | Modify | Handle subscription lifecycle events |
| `supabase/functions/customer-portal/index.ts` | Create | Stripe Customer Portal access |
| `supabase/config.toml` | Modify | Add customer-portal function config |
| `src/hooks/useCreditBundles.ts` | Modify | Include billing_type, recurring_interval, monthly_hours |
| `src/hooks/useSubscriptions.ts` | Create | Fetch active subscriptions |
| `src/hooks/useOrganizationDashboard.ts` | Modify | Include subscriptions data |
| `src/pages/enterprise/ExpertServices.tsx` | Modify | Make Ongoing Advisory clickable, show subscription UI |
| `src/components/organization/PurchaseBundleDialog.tsx` | Modify | Handle subscription bundles differently |
| `src/components/organization/SubscriptionCard.tsx` | Create | Display subscription status |
| `src/components/organization/index.ts` | Modify | Export SubscriptionCard |
| `src/pages/OrganizationDashboard.tsx` | Modify | Add subscriptions section |

## Subscription Credit Behavior

- **Expiry**: Subscription credits have the same 24-month expiry as one-time credits
- **Accumulation**: Unused credits roll over (within the 24-month window)
- **Cancellation**: Upon cancellation, no new credits are granted but existing credits remain usable until expiry
- **FIFO consumption**: Credits are consumed oldest-first (same as one-time credits)

## Edge Cases

- **User not logged in**: Redirect to login with return URL (existing behavior)
- **User has no org**: Prompt to create org (existing behavior)
- **User not admin**: Show admin-required warning (existing behavior)
- **Payment failure**: Stripe handles retries; subscription status updates via webhook
- **Multiple subscriptions**: An org can have multiple active subscriptions (different bundles)
- **Duplicate webhook delivery**: Idempotent handling via unique constraints and status checks

## Security Considerations

- Only org admins can subscribe
- Subscriptions table is read-only for authenticated users
- Only service role can INSERT/UPDATE subscriptions (via webhook)
- Webhook signature verification for all Stripe events
- Customer Portal sessions validated against authenticated user's Stripe customer ID

