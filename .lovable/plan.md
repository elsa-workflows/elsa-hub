## Goal

Let provider admins view invoices and refund customer purchases from the dashboard, and have refunds initiated in Stripe (manually or via dashboard) flow back into the app — automatically reversing the service credits that were granted.

## Scope

- One-time bundle purchases (the Starter Pack flow we just fixed).
- Subscription refunds are explicitly **out of scope** for this round — refunding a recurring invoice raises proration/period-credit questions we should handle separately. I'll keep the refund button disabled with a tooltip on subscription-sourced orders for now.

---

## 1. Provider Orders page — show invoice + refund action

`src/pages/dashboard/provider/ProviderOrders.tsx` + `src/hooks/useProviderOrders.ts`

- Extend `ProviderOrder` to also carry `hosted_invoice_url`, `invoice_pdf_url`, `invoice_number`, `stripe_payment_intent_id`, and a `refunded_amount_cents` field (derived from ledger or a future `order.refunded_cents`).
- Replace the single "Receipt" column with an **Invoice** column showing the invoice number + a link to `hosted_invoice_url` (PDF fallback). Keep `stripe_receipt_url` as a small secondary link.
- New **Actions** column. For each `paid` order, show a "Refund…" button (provider admins only — gate via `is_provider_admin`). Hidden / disabled for `pending`, `cancelled`, `refunded`, and subscription-sourced orders.
- New `RefundOrderDialog` component (`src/components/provider/RefundOrderDialog.tsx`):
  - Shows order summary (bundle, amount, customer, credits granted, credits remaining in the related lot).
  - Radio: **Full refund** / **Partial refund** (amount input in major units, validated ≤ amount remaining to refund).
  - Required reason dropdown (`requested_by_customer` / `duplicate` / `fraudulent`) + optional internal note.
  - Clear warning: "This will refund the customer in Stripe and remove the corresponding service credits from their balance. Already-consumed minutes cannot be reclaimed."
  - On submit: `supabase.functions.invoke("refund-order", { body: { order_id, amount_cents?, reason, notes } })`. Toast on success, invalidate `["provider-orders"]` and credit balance queries.

## 2. Edge function: `refund-order`

New `supabase/functions/refund-order/index.ts`.

- Auth: validate JWT, look up caller's `user_id`, confirm `is_provider_admin(order.service_provider_id)` via service-role client.
- Validates the order is `paid`, has a `stripe_payment_intent_id`, and isn't already fully refunded.
- Calls `stripe.refunds.create({ payment_intent, amount?, reason, metadata: { order_id, initiated_by: user_id } })`.
- Does **not** mutate our DB directly — the resulting `charge.refunded` / `refund.updated` webhook event is the single source of truth. Returns the Stripe refund object so the UI can toast.

## 3. Webhook: handle Stripe-initiated refunds

Extend `supabase/functions/stripe-webhook/index.ts` to handle `charge.refunded` (covers both full and partial; fires on every refund and includes cumulative `amount_refunded`).

For each event:

1. Look up the `order` by `stripe_payment_intent_id = charge.payment_intent`. Bail if not found (e.g. subscription invoice refund — log + ignore for now).
2. Idempotency: compare `charge.amount_refunded` against the sum of existing `credit_ledger_entries` of `reason_code = 'refund'` for this order. Only act on the **delta**.
3. Determine **minutes to claw back** for the delta:
   - Ratio = `delta_cents / order.amount_cents`.
   - `minutes_to_remove = round(ratio * lot.minutes_purchased)`.
   - Capped at `lot.minutes_remaining` (already-consumed minutes can't be reclaimed; we log a warning if the cap kicks in).
4. Update the related `credit_lot`:
   - Subtract `minutes_to_remove` from `minutes_remaining`.
   - If `minutes_remaining` hits 0 and the refund is full, set `status = 'refunded'` (new enum value — see migration below).
5. Insert a `credit_ledger_entries` row: `entry_type = 'debit'`, `minutes_delta = -minutes_to_remove`, `reason_code = 'refund'`, `related_order_id`, `related_credit_lot_id`, `actor_type = 'system'`, notes capturing Stripe refund id + delta amount.
6. Update the order:
   - Full refund (`amount_refunded == amount_total`) → `status = 'refunded'`.
   - Partial → leave status as `paid` but stamp a new `refunded_amount_cents` column for display.
7. Update the `invoices` row: set `status = 'refunded'` (or `partially_refunded` if we add that enum) and refresh `stripe_receipt_url` if the new charge has a refund receipt.
8. Insert an `audit_events` row (`entity_type = 'order'`, `action = 'refunded'`, `after_json` with refund delta and minutes removed) so it surfaces in Activity for both org and provider.
9. Send a notification to org owners + provider admins via the existing notification edge function (new `type = 'refund_issued'`).

## 4. Database migration

Single migration:

- Add `refunded` to `credit_lot_status` enum if missing.
- Add `refunded_amount_cents INTEGER NOT NULL DEFAULT 0` to `orders` (for partial-refund display + idempotency cross-check).
- Add `'refund'` to `ledger_reason_code` enum if it's not already there (it's referenced in `create_credit_adjustment` so likely exists — verify and skip if so).
- No new RLS needed — refund button calls an edge function, and the new column inherits existing `orders` policies.

## 5. Order-detail / Org-side polish

- Mirror the invoice link on `OrgOrders.tsx` if it isn't already shown (the org user already had it after the earlier fix; quick verification only).
- On both org and provider order rows, when `refunded_amount_cents > 0`, show a small "Refunded $X" badge under the amount.

---

## Technical notes

- We rely on `charge.refunded` rather than `refund.created` because it carries the cumulative `amount_refunded`, which makes delta computation trivial and idempotent against multiple partial refunds.
- The minutes-claw-back logic uses the **lot created from this order** (`credit_lots.order_id = order.id`), not FIFO across all lots, so a refund only ever touches credits that came from that specific purchase.
- If the customer has already consumed more than the refunded portion, we still complete the Stripe refund (the money is theirs back) but we zero the lot's remaining minutes and log a warning + audit entry noting the shortfall. We do **not** create negative balances.
- The new `refund-order` function requires no new secrets — it reuses `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- Stripe webhook events for refunds initiated in the Stripe Dashboard will flow through the same `charge.refunded` handler, so manual refunds in Stripe stay in sync automatically.

## Out of scope

- Refunding subscription invoices / proration of recurring credits.
- Refunding provider-created orders that didn't go through Stripe.
- A separate "refunds" listing page (refund history will be visible inline on each order row and in the audit log).