## Goal

Organization admins can download the Stripe-issued invoice (PDF) for every purchase directly from the bundle management dashboard.

## Background

- One-time Checkout sessions today only capture a `stripe_receipt_url` (the charge receipt page). No Stripe `Invoice` is created, so there's no `invoice_pdf` or `hosted_invoice_url` to download.
- Subscription payments do produce a real Stripe Invoice (with `number`, `hosted_invoice_url`, `invoice_pdf`) but we don't capture those fields.
- To make every purchase produce a downloadable Stripe invoice we need to (a) tell Stripe to issue an invoice for one-time checkouts and (b) store the invoice's number, hosted URL and PDF URL.

## Plan

### 1. Database

Migration on `public.invoices`:
- Add `invoice_number text` (nullable)
- Add `hosted_invoice_url text` (nullable)
- Add `invoice_pdf_url text` (nullable)

No RLS changes — existing org-scoped policies cover these new fields.

### 2. Checkout — make Stripe issue an invoice for one-time orders

In `supabase/functions/create-checkout-session/index.ts`, when creating the Checkout Session in `payment` mode, set:

```ts
invoice_creation: {
  enabled: true,
  invoice_data: {
    description: `${bundle.name} — ${bundle.hours} hours`,
    metadata: { order_id, organization_id, service_provider_id },
    // optional: footer, custom_fields, rendering_options
  },
},
```

Subscription checkouts already produce invoices automatically — no change needed there.

### 3. Webhook — persist invoice identifiers

In `supabase/functions/stripe-webhook/index.ts`:

- **`checkout.session.completed` (one-time)**: after the session is paid, retrieve `session.invoice` (expand it), then upsert into `invoices`:
  - `stripe_invoice_id = invoice.id`
  - `invoice_number = invoice.number`
  - `hosted_invoice_url = invoice.hosted_invoice_url`
  - `invoice_pdf_url = invoice.invoice_pdf`
  - keep `stripe_receipt_url` from the charge as a fallback.
- **`invoice.payment_succeeded` (subscriptions)**: extend the existing handler to also store `invoice_number`, `hosted_invoice_url`, `invoice_pdf_url`.

### 4. UI — surface "Download invoice" in the org admin

Update `useOrganizationDashboard` and `OrderWithBundle` to also pull `invoice_number`, `hosted_invoice_url`, `invoice_pdf_url`.

`src/components/organization/PurchaseHistoryTable.tsx`:
- Add an **Invoice #** column (monospace; `—` if not yet issued).
- Replace the current single receipt icon with a small action group: **Download PDF** (→ `invoice_pdf_url`) and **View** (→ `hosted_invoice_url`). Fall back to `stripe_receipt_url` if no invoice exists (legacy rows).
- Mirror on `src/pages/dashboard/org/OrgOrders.tsx`.

Platform admin (`AdminOrders` + `get_admin_orders` RPC): add the same Invoice # column and Download link.

### 5. Legacy rows

Existing paid orders won't have an invoice attached (Stripe doesn't retroactively issue one). They'll continue to show the Stripe charge receipt link. No backfill attempted.

## Out of scope

- Generating our own branded PDF invoices (we rely on Stripe's).
- Editing past invoices or custom invoice templates beyond Stripe's defaults.
- Adding tax/VAT fields — handled separately by the existing billing profile work.

## Technical notes

- `invoice_creation` on a Checkout Session is the supported Stripe pattern for one-time payments. The invoice is generated synchronously when the session completes; we read it via `stripe.checkout.sessions.retrieve(id, { expand: ['invoice'] })` (or the `invoice` event).
- `get_admin_orders` signature changes → `DROP FUNCTION` + recreate inside the same migration.
- All additive: existing webhook idempotency and order flow are unchanged.
