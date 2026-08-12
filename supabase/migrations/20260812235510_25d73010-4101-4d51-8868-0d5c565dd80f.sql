ALTER TABLE public.invoices
  ADD COLUMN subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);