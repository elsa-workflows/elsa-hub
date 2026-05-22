ALTER TYPE credit_lot_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'partially_refunded';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_amount_cents INTEGER NOT NULL DEFAULT 0;
-- Allow webhook to update orders.refunded_amount_cents via service role (already bypasses RLS, no policy needed).
-- Allow service-role updates on invoices (already bypasses RLS). No new RLS needed.