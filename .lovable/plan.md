# Company billing details — guided capture + Stripe invoicing

## Goal

Make every organization aware they can (and should) provide company billing details so Stripe issues properly-addressed tax invoices for every purchase (one-time bundles, subscriptions, and any future Stripe product), and ensure the Stripe side actually emits those invoices in all cases.

## Current state

- `org_billing_profiles` table + `useBillingProfile` hook + `BillingProfileCard` already exist and are mounted in **Org Settings** (admins only).
- `create-checkout-session` already:
  - reads `org_billing_profiles`,
  - creates/updates the Stripe Customer with `name` + `address`,
  - attaches an EU `tax_id` when `vat_number` + `country` are set,
  - enables `invoice_creation` for one-time sessions.
- Gaps: (a) one-time sessions don't attach the resolved `stripeCustomerId` (they pass `customer_email` instead), so the customer's address/tax_id isn't bound to the invoice; (b) no UX anywhere prompts users to fill billing details — they have to discover the Settings card; (c) no warning at purchase time.

## Plan

### 1. UX: surface "Add company billing details" at the right moments

Single shared component `BillingDetailsReminder` (banner variant + inline-alert variant) driven by `useBillingProfile(orgId)` + a small `isBillingProfileComplete()` helper (required: `company_legal_name`, `address_line1`, `city`, `postal_code`, `country`).

Shown in three places:

a. **After org creation (first-time)** — in the new-organization flow, on success, route the user to `OrgSettings` with a query flag (e.g. `?setup=billing`) that auto-scrolls to `BillingProfileCard`, highlights it, and shows a one-time toast "Add your company details to get proper tax invoices on every purchase."

b. **Org dashboard overview** — persistent dismissible banner on `OrgOverview` (and at the top of `OrgSettings`) when the profile is incomplete, with a "Complete billing details" CTA that opens the card. Dismissal is per-user, per-org, stored in `localStorage` (key includes org id) and re-appears after a purchase attempt.

c. **At purchase time** — in `PurchaseBundleDialog`, when the selected org's billing profile is incomplete, show an inline `Alert` above the Purchase button:
  > "No company details on file — your invoice will only show your email. [Add company details]"
  Non-blocking by default (link opens settings in a new tab); checkout still proceeds. (Open question below.)

No new tables. No DB migration required.

### 2. Stripe: make invoicing reliable for every product

In `supabase/functions/create-checkout-session/index.ts`:

- **One-time sessions:** when `stripeCustomerId` exists, pass `customer: stripeCustomerId` instead of `customer_email`, so the customer's stored `address` and `tax_ids` flow onto the generated Invoice. Keep `customer_email` only as a fallback when no customer was found.
- Add `invoice_creation.invoice_data.custom_fields` for VAT number / registration number when present, and set `rendering_options.amount_tax_display = 'include_inclusive_tax'` so the PDF is presentable.
- **Subscriptions:** Stripe auto-issues invoices, but ensure the Customer object is updated with address/tax_id *before* `checkout.sessions.create` (it already is). Add `subscription_data.description` so renewal invoices are labeled.
- **All sessions:** set `automatic_tax: { enabled: false }` explicitly (we collect tax ids but don't compute tax) and `customer_update: { address: 'auto', name: 'auto' }` when `customer` is passed, so Stripe keeps the Customer in sync if it changes during checkout.

This makes invoicing work for **any** Stripe product routed through this function — not just the credit bundles.

### 3. Backfill / safety net

The existing `backfill-order-invoice` function already covers historical orders. No change needed.

## Files

**New**
- `src/components/organization/BillingDetailsReminder.tsx` — banner + inline alert variants, plus exported `isBillingProfileComplete(profile)`.

**Edited**
- `src/components/organization/index.ts` — export the new component/helper.
- `src/pages/dashboard/org/OrgOverview.tsx` — mount the banner at top (admins only).
- `src/pages/dashboard/org/OrgSettings.tsx` — read `?setup=billing` and scroll/highlight the `BillingProfileCard`; also show banner above the card when incomplete.
- Org creation flow (the component that calls "create organization" — likely `OrganizationSelector` or a dedicated dialog; will be located during implementation) — on success, navigate to `/org/<slug>/settings?setup=billing` and toast.
- `src/components/organization/PurchaseBundleDialog.tsx` — inline alert when selected org's profile is incomplete.
- `supabase/functions/create-checkout-session/index.ts` — attach `customer` for one-time when available, add `custom_fields` (VAT / reg no), `customer_update`, `rendering_options`, `subscription_data.description`, explicit `automatic_tax`.

## Open questions

1. **Block purchase or warn only?** Should missing billing details be a **hard block** ("Add details before purchasing") or a **soft warning** (current proposal)? Soft is friendlier; hard guarantees every invoice is correctly addressed. Recommended: **soft**, since Stripe still produces a valid receipt/invoice with email-only, and blocking adds friction to first-time buyers.

2. **Required fields.** Proposal treats `company_legal_name`, `address_line1`, `city`, `postal_code`, `country` as required; `vat_number`, `registration_number`, `state_province`, `address_line2` as optional. OK?

3. **Per-user dismissal scope.** Banner dismissal is `localStorage` per `(user, org)` and resets after each purchase attempt — acceptable, or do you want it to never auto-resurrect once dismissed?
