
# Stripe Checkout Flow Implementation Plan

## Overview

Implement a complete Stripe Checkout integration allowing organizations to purchase credit bundles (expert service hours). The flow will include:

1. **Seed Data** - Create a default service provider ("Skywalker Digital") and sample credit bundles
2. **Stripe Secret** - Configure the Stripe API key as an edge function secret
3. **Edge Functions** - Create checkout session and webhook handlers
4. **UI Components** - Purchase dialog and success/cancel pages

---

## Architecture

### Purchase Flow

```text
User clicks "Buy Credits"
        |
        v
+-------------------+
| PurchaseBundleDialog |
| - Lists available   |
|   credit bundles    |
| - Select bundle     |
+-------------------+
        |
        v
+-------------------+
| create-checkout   |
| Edge Function     |
| - Creates order   |
| - Creates Stripe  |
|   checkout session|
+-------------------+
        |
        v
+-------------------+
| Stripe Checkout   |
| (hosted page)     |
+-------------------+
        |
        v (on success)
+-------------------+
| stripe-webhook    |
| Edge Function     |
| - Updates order   |
| - Creates invoice |
| - Creates credit  |
|   lot + ledger    |
+-------------------+
        |
        v
+-------------------+
| /checkout/success |
| - Confirmation    |
| - Redirect to org |
+-------------------+
```

---

## Implementation Steps

### Phase 1: Database Seed Data

**Migration: Seed default provider and bundles**

Insert "Skywalker Digital" as the default service provider and create sample credit bundles:

- **Starter Pack**: 5 hours @ $400 ($80/hr)
- **Growth Pack**: 10 hours @ $750 ($75/hr) 
- **Scale Pack**: 25 hours @ $1,625 ($65/hr)
- **Enterprise Pack**: 50 hours @ $2,750 ($55/hr)

The migration will also create a `provider_customers` relationship when an organization purchases, allowing the service provider to see customer data.

---

### Phase 2: Stripe Secret Configuration

Before implementing edge functions, I'll request the Stripe secret key to be added. This is required for:
- Creating Stripe Checkout sessions
- Verifying webhook signatures
- Fetching payment details and receipts

---

### Phase 3: Edge Functions

**1. `create-checkout-session`**

Handles checkout initiation:

- **Input**: `bundleId`, `organizationId`
- **Auth**: Verify user is org admin using JWT
- **Logic**:
  1. Validate bundle exists and is active
  2. Create `orders` record with status `pending`
  3. Create Stripe Checkout Session with:
     - Line item from bundle price
     - Success/cancel URLs with order ID
     - Metadata: `orderId`, `organizationId`, `bundleId`
  4. Update order with `stripe_checkout_session_id`
  5. Return checkout URL

**2. `stripe-webhook`**

Handles `checkout.session.completed` events:

- **Auth**: Verify Stripe webhook signature
- **Logic** (idempotent):
  1. Extract metadata from session
  2. Find order by checkout session ID
  3. Skip if order already `paid`
  4. Update order: status = `paid`, `stripe_payment_intent_id`, `paid_at`
  5. Create invoice with receipt URL from charge
  6. Create credit lot (hours * 60 = minutes, 24-month expiry)
  7. Create credit ledger entry (purchase credit)
  8. Create provider_customer relationship if not exists

Uses partial unique indexes for idempotency (already exist in DB).

---

### Phase 4: UI Components

**1. `src/components/organization/PurchaseBundleDialog.tsx`**

A dialog accessible from the CreditBalanceCard:
- Lists available bundles with pricing
- Shows hours, price per hour, and total
- "Buy Now" button initiates checkout
- Loading state while redirecting to Stripe

**2. Update `CreditBalanceCard.tsx`**

Add a "Buy Credits" button that opens the purchase dialog (visible to org admins).

**3. `src/pages/CheckoutSuccess.tsx`**

Success landing page after Stripe checkout:
- Shows confirmation message
- Provides link back to organization dashboard
- Handles order ID from URL params

**4. `src/pages/CheckoutCancel.tsx`**

Cancel/failure page:
- Shows message that checkout was cancelled
- Link to try again or return to dashboard

**5. Update `src/App.tsx`**

Add routes:
- `/checkout/success` -> CheckoutSuccess
- `/checkout/cancel` -> CheckoutCancel

---

### Phase 5: Hook Updates

**Update `useOrganizationDashboard.ts`**

- Add `availableBundles` query to fetch active credit bundles
- Add `refetchOrders` function to refresh after purchase

---

## Technical Details

### Stripe Checkout Session Configuration

```text
Mode: payment (one-time)
Line items: 1 bundle = 1 line item
Success URL: https://elsa-hub.lovable.app/checkout/success?session_id={CHECKOUT_SESSION_ID}
Cancel URL: https://elsa-hub.lovable.app/checkout/cancel?org_slug={slug}
Metadata: orderId, organizationId, bundleId, serviceProviderId
```

### Credit Lot Creation

When payment completes:
- `minutes_purchased` = bundle hours * 60
- `minutes_remaining` = same as purchased
- `expires_at` = NOW() + 24 months
- `status` = 'active'

### Idempotency Strategy

The existing partial unique indexes handle webhook retries:
- `idx_credit_lots_order_unique`: One credit lot per order
- `idx_ledger_purchase_order_unique`: One purchase ledger entry per order
- `idx_invoices_order_unique`: One invoice per order

The webhook uses "INSERT + catch unique violation" pattern.

### Security

- Edge functions use dual-client pattern (User Client for RLS, Service Client for privileged ops)
- Webhook verifies Stripe signature using webhook secret
- Orders can only be created by org admins (RLS policy exists)

---

## File Structure

```text
supabase/
  functions/
    create-checkout-session/
      index.ts
      deno.json
    stripe-webhook/
      index.ts
      deno.json

src/
  components/
    organization/
      PurchaseBundleDialog.tsx   (new)
      CreditBalanceCard.tsx      (update - add buy button)
  pages/
    CheckoutSuccess.tsx          (new)
    CheckoutCancel.tsx           (new)
  hooks/
    useOrganizationDashboard.ts  (update - add bundles)
  App.tsx                        (update - add routes)
```

---

## Secrets Required

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (sk_live_* or sk_test_*) |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (whsec_*) |

---

## Dependencies

No new npm packages required. Uses existing:
- Stripe via `npm:stripe` in Deno edge functions
- shadcn/ui components for dialog and buttons
- React Router for navigation

---

## Summary

This implementation provides a complete Stripe checkout flow:
1. Org admins see "Buy Credits" in their dashboard
2. They select a bundle from available options
3. Edge function creates an order and Stripe session
4. User completes payment on Stripe's hosted checkout
5. Webhook processes payment, creates credits automatically
6. User returns to success page, credits are immediately available
