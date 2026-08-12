import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CreditCard, Loader2, AlertCircle, Check, RefreshCw, Info, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrganizationSelector } from "./OrganizationSelector";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditBundlesFull, CreditBundleFull } from "@/hooks/useCreditBundlesFull";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AvailabilityDisclaimer } from "@/components/enterprise";
import { BillingDetailsReminder } from "./BillingDetailsReminder";

interface PurchaseBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedBundleId?: string | null;
  /** Preselect a Runtime product subscription by id. */
  preSelectedProductId?: string | null;
  /** Show Runtime product subscriptions alongside credit bundles. Default true. */
  showProducts?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  price_cents: number;
  currency: string;
  recurring_interval: string;
  stripe_price_id: string | null;
  is_active: boolean;
  triage_response_business_days: number | null;
  includes_backports: boolean;
  service_provider_id: string;
}

type SelectedItem =
  | { type: "bundle"; item: CreditBundleFull }
  | { type: "product"; item: Product };

export function PurchaseBundleDialog({ open, onOpenChange, preSelectedBundleId, preSelectedProductId, showProducts = true }: PurchaseBundleDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedOrganization, organizations, isAdmin } = useOrganization();
  const { data: bundles, isLoading: bundlesLoading } = useCreditBundlesFull();
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select bundle when dialog opens with a pre-selected bundle
  useEffect(() => {
    if (open && preSelectedBundleId && bundles) {
      const bundle = bundles.find(b => b.id === preSelectedBundleId);
      if (bundle) {
        setSelectedItem({ type: "bundle", item: bundle });
      }
    }
  }, [open, preSelectedBundleId, bundles]);

  // Auto-select product when dialog opens with a pre-selected product
  useEffect(() => {
    if (open && preSelectedProductId && products.length > 0) {
      const product = products.find(p => p.id === preSelectedProductId);
      if (product) {
        setSelectedItem({ type: "product", item: product });
      }
    }
  }, [open, preSelectedProductId, products]);

  // Load active products for the same service providers represented by the bundles
  useEffect(() => {
    if (!showProducts || !bundles || bundles.length === 0) return;
    const providerIds = [...new Set(bundles.map(b => b.service_provider_id))];
    if (providerIds.length === 0) return;

    let cancelled = false;
    setProductsLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, tier, description, price_cents, currency, recurring_interval, stripe_price_id, is_active, triage_response_business_days, includes_backports, service_provider_id"
        )
        .eq("is_active", true)
        .in("service_provider_id", providerIds)
        .order("price_cents", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("Failed to load products", error);
      } else {
        setProducts(data || []);
      }
      setProductsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [showProducts, bundles]);

  const extractInvokeError = async (err: unknown): Promise<string | null> => {
    const ctx = (err as { context?: unknown })?.context;
    if (ctx && typeof (ctx as Response).json === "function") {
      try {
        const body = await (ctx as Response).clone().json();
        if (body?.error) return String(body.error);
      } catch {
        try {
          const text = await (ctx as Response).clone().text();
          if (text) return text;
        } catch {
          /* no body */
        }
      }
    }
    return null;
  };

  const handlePurchase = async () => {
    if (!selectedItem || !selectedOrganization) return;

    setIsProcessing(true);
    setError(null);

    try {
      const payload =
        selectedItem.type === "bundle"
          ? { bundleId: selectedItem.item.id, organizationId: selectedOrganization.id }
          : { productId: selectedItem.item.id, organizationId: selectedOrganization.id };

      const { data, error: fnError } = await supabase.functions.invoke("create-checkout-session", {
        body: payload,
      });

      if (fnError) {
        const serverMessage = await extractInvokeError(fnError);
        throw new Error(serverMessage || fnError.message || "Failed to start checkout");
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.checkoutUrl) throw new Error("No checkout URL returned");

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsProcessing(false);
    }
  };


  const formatPrice = (cents: number, currency: string, isRecurring?: boolean, interval?: string | null) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(cents / 100);

    if (isRecurring && interval) {
      return `${formatted}/${interval}`;
    }
    return formatted;
  };

  const formatCommitments = (product: Product) => {
    const parts: string[] = [];
    if (typeof product.triage_response_business_days === "number") {
      parts.push(
        `Triage: ${product.triage_response_business_days} business day${product.triage_response_business_days === 1 ? "" : "s"}`
      );
    }
    if (product.includes_backports) {
      parts.push("Backports included");
    }
    return parts.join(" · ");
  };

  // Not logged in - redirect to login with return URL
  const handleSignInRedirect = () => {
    const returnUrl = `/elsa-plus/expert-services/valence-works${preSelectedBundleId ? `?bundleId=${preSelectedBundleId}` : ""}`;
    navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>
              You need to sign in to purchase service credits.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSignInRedirect}>Sign In</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No organizations
  if (organizations.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create an organization</DialogTitle>
            <DialogDescription>
              You need to create an organization before purchasing service credits.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate("/account")}>Go to Account</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isSubscription =
    selectedItem?.type === "product" ||
    (selectedItem?.type === "bundle" && selectedItem.item.billing_type === "recurring");

  const hasProducts = products.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isSubscription ? "Subscribe to Service" : "Purchase Service Credits"}
          </DialogTitle>
          <DialogDescription>
            {isSubscription
              ? "Select a subscription plan or credit bundle and complete your signup."
              : "Select a bundle and complete your purchase to get started."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Organization selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {isSubscription ? "Subscribing as" : "Purchasing as"}
            </label>
            <OrganizationSelector className="w-full" />
            {selectedOrganization && !isAdmin && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only organization admins can {isSubscription ? "subscribe" : "purchase credits"}. Contact an admin of{" "}
                  <strong>{selectedOrganization.name}</strong> to make this {isSubscription ? "subscription" : "purchase"}.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {selectedOrganization && isAdmin && (
            <div className="space-y-6">
              {/* Credit bundles */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Service credits</label>
                {bundlesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {bundles?.map((bundle) => {
                      const isConfigured = !!bundle.stripe_price_id;
                      const isRecurring = bundle.billing_type === "recurring";
                      const hours = isRecurring ? bundle.monthly_hours : bundle.hours;
                      const isSelected = selectedItem?.type === "bundle" && selectedItem.item.id === bundle.id;

                      return (
                        <Card
                          key={bundle.id}
                          className={cn(
                            "cursor-pointer transition-all",
                            isSelected
                              ? "border-primary ring-1 ring-primary"
                              : "hover:border-primary/50",
                            !isConfigured && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => isConfigured && setSelectedItem({ type: "bundle", item: bundle })}
                        >
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full border-2",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted"
                                )}
                              >
                                {isSelected ? (
                                  <Check className="h-5 w-5" />
                                ) : isRecurring ? (
                                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {bundle.name}
                                  {isRecurring && (
                                    <Badge variant="secondary" className="text-xs">
                                      Subscription
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {hours} hours{isRecurring ? " per month" : " of expert time"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {formatPrice(bundle.price_cents, bundle.currency, isRecurring, bundle.recurring_interval)}
                              </div>
                              {!isConfigured && (
                                <Badge variant="secondary" className="text-xs">
                                  Coming soon
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Runtime products */}
              {hasProducts && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Subscriptions</label>
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {products.map((product) => {
                        const isConfigured = !!product.stripe_price_id;
                        const isSelected = selectedItem?.type === "product" && selectedItem.item.id === product.id;
                        const commitments = formatCommitments(product);

                        return (
                          <Card
                            key={product.id}
                            className={cn(
                              "cursor-pointer transition-all",
                              isSelected
                                ? "border-primary ring-1 ring-primary"
                                : "hover:border-primary/50",
                              !isConfigured && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => isConfigured && setSelectedItem({ type: "product", item: product })}
                          >
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-full border-2",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted"
                                  )}
                                >
                                  {isSelected ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {product.name}
                                    <Badge variant="secondary" className="text-xs">
                                      Subscription
                                    </Badge>
                                  </div>
                                  {commitments && (
                                    <div className="text-sm text-muted-foreground">{commitments}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">
                                  {formatPrice(product.price_cents, product.currency, true, product.recurring_interval)}
                                </div>
                                {!isConfigured && (
                                  <Badge variant="secondary" className="text-xs">
                                    Coming soon
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Billing details reminder + availability disclaimer before checkout */}
        {selectedItem && selectedOrganization && isAdmin && (
          <div className="mt-2 space-y-2">
            <BillingDetailsReminder
              organizationId={selectedOrganization.id}
              organizationSlug={selectedOrganization.slug}
              variant="inline"
            />
            <AvailabilityDisclaimer />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedItem || !selectedOrganization || !isAdmin || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isSubscription ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Subscribe
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Continue to Payment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
