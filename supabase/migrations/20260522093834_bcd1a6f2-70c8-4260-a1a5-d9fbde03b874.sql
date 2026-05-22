ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS hosted_invoice_url text,
  ADD COLUMN IF NOT EXISTS invoice_pdf_url text;

DROP FUNCTION IF EXISTS public.get_admin_orders(integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_admin_orders(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, organization_id uuid, organization_name text, bundle_name text, amount_cents integer, currency text, status order_status, created_at timestamp with time zone, paid_at timestamp with time zone, invoice_number text, hosted_invoice_url text, invoice_pdf_url text, stripe_receipt_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  RETURN QUERY
  SELECT
    ord.id,
    ord.organization_id,
    org.name as organization_name,
    cb.name as bundle_name,
    ord.amount_cents,
    ord.currency,
    ord.status,
    ord.created_at,
    ord.paid_at,
    inv.invoice_number,
    inv.hosted_invoice_url,
    inv.invoice_pdf_url,
    inv.stripe_receipt_url
  FROM orders ord
  JOIN organizations org ON org.id = ord.organization_id
  JOIN credit_bundles cb ON cb.id = ord.credit_bundle_id
  LEFT JOIN invoices inv ON inv.order_id = ord.id
  WHERE (p_status IS NULL OR ord.status::TEXT = p_status)
  ORDER BY ord.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_orders(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_orders(integer, integer, text) TO authenticated, service_role;