import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  organization_id: string;
  service_provider_id: string;
  credit_bundle_id: string | null;
  product_id: string | null;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  /** Display name: credit bundle name or product name */
  bundle_name: string;
  /** Null for product subscriptions (e.g. Valence Runtime) which grant no hours */
  monthly_hours: number | null;
  /** True when backed by a product rather than a credit bundle */
  is_product: boolean;
  /** Recurring price for product subscriptions */
  price_cents: number | null;
  price_currency: string | null;
  recurring_interval: string | null;
  /** Most recent invoice recorded for this subscription, if any */
  invoice_number: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
}

export function useSubscriptions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["subscriptions", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!subscriptions || subscriptions.length === 0) return [];

      // Fetch bundle info
      const bundleIds = [...new Set(subscriptions.map(s => s.credit_bundle_id).filter(Boolean))] as string[];
      const productIds = [...new Set(subscriptions.map(s => s.product_id).filter(Boolean))] as string[];

      const [bundlesRes, productsRes] = await Promise.all([
        bundleIds.length
          ? supabase.from("credit_bundles").select("id, name, monthly_hours").in("id", bundleIds)
          : Promise.resolve({ data: [] as { id: string; name: string; monthly_hours: number | null }[] }),
        productIds.length
          ? supabase
              .from("products")
              .select("id, name, price_cents, currency, recurring_interval")
              .in("id", productIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                name: string;
                price_cents: number;
                currency: string;
                recurring_interval: string;
              }[],
            }),
      ]);

      const { data: invoiceRows } = await supabase
        .from("invoices")
        .select("subscription_id, invoice_number, hosted_invoice_url, invoice_pdf_url, created_at")
        .in("subscription_id", subscriptions.map(s => s.id))
        .order("created_at", { ascending: false });

      // Most recent invoice per subscription (rows arrive newest-first)
      const invoiceMap = new Map<string, { invoice_number: string | null; hosted_invoice_url: string | null; invoice_pdf_url: string | null }>();
      for (const inv of invoiceRows || []) {
        if (inv.subscription_id && !invoiceMap.has(inv.subscription_id)) {
          invoiceMap.set(inv.subscription_id, {
            invoice_number: inv.invoice_number,
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf_url: inv.invoice_pdf_url,
          });
        }
      }

      const bundleMap = new Map(
        (bundlesRes.data || []).map(b => [b.id, { name: b.name, monthly_hours: b.monthly_hours }])
      );
      const productMap = new Map((productsRes.data || []).map(p => [p.id, p]));

      return subscriptions.map(sub => {
        const bundle = sub.credit_bundle_id ? bundleMap.get(sub.credit_bundle_id) : undefined;
        const product = sub.product_id ? productMap.get(sub.product_id) : undefined;
        const invoice = invoiceMap.get(sub.id);
        return {
          ...sub,
          bundle_name: bundle?.name ?? product?.name ?? "Unknown",
          monthly_hours: bundle ? bundle.monthly_hours ?? 0 : null,
          is_product: !!product,
          price_cents: product?.price_cents ?? null,
          price_currency: product?.currency ?? null,
          recurring_interval: product?.recurring_interval ?? null,
          invoice_number: invoice?.invoice_number ?? null,
          hosted_invoice_url: invoice?.hosted_invoice_url ?? null,
          invoice_pdf_url: invoice?.invoice_pdf_url ?? null,
        };
      }) as Subscription[];
    },
    enabled: !!organizationId,
  });
}

