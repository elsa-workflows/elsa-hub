## Goal
Restore a downloadable receipt for order `D33C45ED` (Signicat) in the org dashboard. The order was paid before invoice-creation was added to the checkout flow, so `invoices` has no row.

## Approach
Build a small, reusable backfill edge function rather than a one-off script. Same function can be reused for any other historical pre-fix orders.

### New edge function: `backfill-order-invoice`
- Auth: platform-admin only (`is_platform_admin(auth.uid())` check via service-role client).
- Input: `{ order_id: uuid }`.
- Steps:
  1. Load order by `id`, require `status = 'paid'` and `stripe_checkout_session_id` present.
  2. `stripe.checkout.sessions.retrieve(session_id, { expand: ['payment_intent.latest_charge', 'invoice'] })`.
  3. Resolve fields:
     - `stripe_receipt_url` ← `invoice.hosted_invoice_url ?? charge.receipt_url`
     - `invoice_pdf_url` ← `invoice.invoice_pdf ?? null`
     - `hosted_invoice_url` ← `invoice.hosted_invoice_url ?? null`
     - `invoice_number` ← `invoice.number ?? null`
     - `stripe_invoice_id` ← `invoice.id ?? charge.id`
  4. Upsert into `invoices` (service role) keyed on `order_id`, with `organization_id`, `service_provider_id`, `currency`, `total_cents = order.amount_cents`, `status = 'paid'`, `paid_at = order.paid_at`, `issued_at = now()`.
- Returns the resolved URLs so I can verify in the response.

### Invocation
Once deployed, I invoke it with `order_id = d33c45ed-2a3d-45e2-9c84-fbe7c17cb93b`. The PaymentIntent has no Stripe `invoice` attached (no `invoice_creation` enabled at the time), so the backfill will populate `stripe_receipt_url` from the charge — that becomes the **Download** link in `PurchaseHistoryTable` (which already falls back to `stripe_receipt_url`). No formal Stripe Invoice PDF/number will exist for this row; the existing UI label "Download" / "View receipt" handles this case correctly.

### No frontend changes
The org dashboard `PurchaseHistoryTable` and `AdminOrders` already prefer `invoice_pdf_url` → `hosted_invoice_url` → `stripe_receipt_url`. Once the row exists, the Download link appears automatically.

### Out of scope
- Generating a brand-new Stripe Invoice PDF retroactively for this charge (Stripe can't attach an invoice to a past PaymentIntent; only a separate out-of-band invoice could be issued, which would double-count revenue). The Stripe-hosted **receipt** is the standard artifact for this case.
- Bulk backfill of all historical pre-fix orders (function supports it, but I'll only run it for D33C45ED unless you ask otherwise).

## Files
- `supabase/functions/backfill-order-invoice/index.ts` — new
- `supabase/config.toml` — register function (verify_jwt default)
