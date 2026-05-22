-- Add real UNIQUE constraint on invoices.order_id so PostgREST upsert (onConflict=order_id) works.
-- Drop the partial unique index in favor of a full constraint; NULLs remain allowed and distinct.
DROP INDEX IF EXISTS public.idx_invoices_order_unique;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_order_id_unique UNIQUE (order_id);

-- Backfill the missing invoice row for order ADE6F301
INSERT INTO public.invoices (
  order_id, organization_id, service_provider_id, total_cents, currency,
  status, issued_at, paid_at
)
SELECT id, organization_id, service_provider_id, amount_cents, currency,
       'paid'::invoice_status, COALESCE(paid_at, now()), paid_at
FROM public.orders
WHERE id = 'ade6f301-4da4-47c2-9b3f-9df7886661ce'
ON CONFLICT (order_id) DO NOTHING;