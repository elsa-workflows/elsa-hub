
# Platform-Wide Purchasing System Implementation

## Executive Summary

This plan implements the complete Stripe-powered purchasing flow for service credit bundles. The database schema, RLS policies, and fulfillment logic are already in place. We need to: (1) configure Stripe, (2) create two edge functions for checkout/webhooks, and (3) add purchasing UI to the Expert Services page.

## Current State Analysis

**Already Implemented:**
- Full database schema (orders, invoices, credit_bundles, credit_lots, ledger)
- RLS policies enforcing org/provider access rules
- RPC functions for credit balance and allocation
- Idempotency indexes for safe webhook handling
- Pre-seeded provider (Skywalker Digital) and 4 credit bundles
- Organization dashboard showing credit balances and purchase history
- 24-month credit expiry policy

**Missing:**
- Stripe secret key configuration
- Edge functions for checkout flow
- Purchase UI components

---

## Implementation Plan

### Phase 1: Stripe Configuration

#### 1.1 Add Stripe Secret Key
Use the Lovable secrets tool to add `STRIPE_SECRET_KEY` to the project.

#### 1.2 Update Credit Bundles with Stripe Price IDs
After Stripe products are created, update the `credit_bundles` table with corresponding `stripe_price_id` values.

---

### Phase 2: Edge Functions

#### 2.1 Create `create-checkout-session` Edge Function

**Purpose:** Create a Stripe Checkout session for purchasing credit bundles

**Location:** `supabase/functions/create-checkout-session/index.ts`

**Logic:**
```text
1. Verify authentication (JWT validation)
2. Parse request: { bundleId, organizationId }
3. Validate user is org admin for the organization
4. Fetch bundle details (verify active, get price_cents, stripe_price_id)
5. Create pending order in Supabase:
   - status: 'pending'
   - organization_id, service_provider_id, credit_bundle_id
   - amount_cents, currency
   - created_by: user_id
6. Create Stripe Checkout Session:
   - mode: 'payment'
   - line_items: [{ price: stripe_price_id, quantity: 1 }]
   - metadata: { order_id, organization_id, service_provider_id, bundle_id }
   - success_url: /org/{slug}?payment=success
   - cancel_url: /enterprise/expert-services?payment=cancelled
7. Update order with stripe_checkout_session_id
8. Return { checkoutUrl }
```

**Config:** `supabase/config.toml`
```toml
[functions.create-checkout-session]
verify_jwt = false
```

#### 2.2 Create `stripe-webhook` Edge Function

**Purpose:** Handle Stripe webhook events for payment fulfillment

**Location:** `supabase/functions/stripe-webhook/index.ts`

**Logic:**
```text
1. Verify Stripe webhook signature
2. Handle 'checkout.session.completed' event:
   a. Extract order_id from metadata
   b. Load order - if already 'paid', attempt receipt URL update only
   c. Update order: status='paid', paid_at=now, stripe_payment_intent_id
   d. Upsert provider_customers relationship
   e. Create credit_lot:
      - minutes_purchased = bundle.hours * 60
      - expires_at = now + 24 months
   f. Create credit_ledger_entry (credit, reason='purchase')
   g. Upsert invoice with stripe_receipt_url
   h. Create audit_event
```

**Receipt URL Retrieval:**
```text
PaymentIntent → expand latest_charge → Charge.receipt_url
```

**Config:**
```toml
[functions.stripe-webhook]
verify_jwt = false
```

---

### Phase 3: Frontend Implementation

#### 3.1 Create `OrganizationContext` Provider

**Purpose:** Track which organization the user is currently acting as

**Location:** `src/contexts/OrganizationContext.tsx`

**Features:**
- Store selected organization (id, name, slug)
- Persist to localStorage
- Auto-select if user has only one organization
- Provide `selectOrganization()` function

#### 3.2 Create `OrganizationSelector` Component

**Purpose:** Allow users to switch between organizations

**Location:** `src/components/organization/OrganizationSelector.tsx`

**Features:**
- Dropdown showing user's organizations
- Visual indicator of current selection
- Used in header/navigation when relevant

#### 3.3 Create `PurchaseBundleDialog` Component

**Purpose:** Modal for selecting and purchasing a credit bundle

**Location:** `src/components/organization/PurchaseBundleDialog.tsx`

**Features:**
- Display available bundles from database (not hardcoded)
- Show "Purchasing as: {Organization Name}"
- If no organization selected, prompt to select one
- If user is not org admin, show "Ask an Org Admin" message
- Submit button calls `create-checkout-session` edge function
- Redirect to Stripe Checkout on success

#### 3.4 Update Expert Services Page

**Location:** `src/pages/enterprise/ExpertServices.tsx`

**Changes:**
- Replace hardcoded bundles with database fetch
- Add "Purchase Credits" button that opens `PurchaseBundleDialog`
- Handle payment success/cancelled query params with toast notifications

#### 3.5 Create Success/Cancel Handlers

Add query param handling for payment status on:
- `/org/{slug}?payment=success` - Show success toast
- `/enterprise/expert-services?payment=cancelled` - Show cancellation toast

---

### Phase 4: Database Updates

#### 4.1 Update Stripe Price IDs

After creating products in Stripe Dashboard, run SQL to update bundles:
```sql
UPDATE credit_bundles 
SET stripe_price_id = 'price_xxx' 
WHERE id = 'bundle-uuid';
```

---

## Technical Details

### Edge Function: create-checkout-session

| Input | Type | Required |
|-------|------|----------|
| bundleId | UUID | Yes |
| organizationId | UUID | Yes |

| Output | Type |
|--------|------|
| checkoutUrl | string |

### Edge Function: stripe-webhook

| Event | Action |
|-------|--------|
| checkout.session.completed | Full fulfillment flow |
| checkout.session.expired | Mark order as cancelled |

### Security Model

| Actor | Can Purchase | Can View Orders | Can View Credits |
|-------|--------------|-----------------|------------------|
| Org Admin | Yes | Own org | Own org |
| Org Member | No | Own org | Own org |
| Provider Admin | No | Customers | Customers |
| Provider Member | No | No | No |

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/create-checkout-session/index.ts` | Create | Checkout session creation |
| `supabase/functions/create-checkout-session/deno.json` | Create | Deno config |
| `supabase/functions/stripe-webhook/index.ts` | Create | Webhook handler |
| `supabase/functions/stripe-webhook/deno.json` | Create | Deno config |
| `supabase/config.toml` | Edit | Add function configs |
| `src/contexts/OrganizationContext.tsx` | Create | Organization selection state |
| `src/components/organization/OrganizationSelector.tsx` | Create | Org selection dropdown |
| `src/components/organization/PurchaseBundleDialog.tsx` | Create | Purchase flow modal |
| `src/hooks/useCreditBundles.ts` | Create | Fetch bundles from DB |
| `src/pages/enterprise/ExpertServices.tsx` | Edit | Add purchase flow |
| `src/pages/OrganizationDashboard.tsx` | Edit | Handle success param |
| `src/App.tsx` | Edit | Add OrganizationProvider |

---

## Extensibility Notes

The current implementation uses `credit_bundle_id` in orders. For future product types (subscriptions, training, digital products):

1. **Current state is sufficient for Phase 1** - credit bundles work with existing schema
2. **Future extension**: Add `offering_type` enum and polymorphic fulfillment logic in the webhook
3. The order/invoice model is already generic and will work for all product types

---

## Sequence Diagram: Purchase Flow

```text
User                    Frontend              Edge Function          Stripe              Supabase
  |                         |                       |                   |                    |
  |-- Click "Purchase" ---> |                       |                   |                    |
  |                         |-- POST /create-checkout-session -------> |                    |
  |                         |                       |-- Verify admin ------------> is_org_admin
  |                         |                       |-- Create order ----------------------> INSERT orders
  |                         |                       |-- Create session --> |                |
  |                         |                       | <-- session.url --- |                |
  |                         | <-- { checkoutUrl } --|                   |                    |
  |<-- Redirect to Stripe --|                       |                   |                    |
  |                         |                       |                   |                    |
  |-- Complete payment ----------------------------> |                   |                    |
  |                         |                       |                   |                    |
  |                         |                       | <-- webhook ------|                    |
  |                         |                       |-- Update order ----------------------> UPDATE orders
  |                         |                       |-- Create credit_lot -----------------> INSERT credit_lots
  |                         |                       |-- Create ledger entry ---------------> INSERT ledger
  |                         |                       |-- Create invoice --------------------> INSERT invoices
  |                         |                       |-- Return 200 --> |                    |
  |                         |                       |                   |                    |
  |<-- Redirect to success -|                       |                   |                    |
```

---

## Prerequisites Before Implementation

1. **Stripe Account**: Must be configured with products/prices matching the bundles
2. **STRIPE_SECRET_KEY**: Must be added as a Supabase secret
3. **STRIPE_WEBHOOK_SECRET**: Must be added for signature verification
4. **Stripe Price IDs**: Must be set in `credit_bundles` table after products are created
