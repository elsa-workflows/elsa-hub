import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CreditCard, Loader2, AlertCircle, Check, RefreshCw, Info } from "lucide-react";
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

interface PurchaseBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedBundleId?: string | null;
}

export function PurchaseBundleDialog({ open, onOpenChange, preSelectedBundleId }: PurchaseBundleDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedOrganization, organizations, isAdmin } = useOrganization();
  const { data: bundles, isLoading: bundlesLoading } = useCreditBundlesFull();
  const [selectedBundle, setSelectedBundle] = useState<CreditBundleFull | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select bundle when dialog opens with a pre-selected bundle
  useEffect(() => {
    if (open && preSelectedBundleId && bundles) {
      const bundle = bundles.find(b => b.id === preSelectedBundleId);
      if (bundle) {
        setSelectedBundle(bundle);
      }
    }
  }, [open, preSelectedBundleId, bundles]);

  const handlePurchase = async () => {
    if (!selectedBundle || !selectedOrganization) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          bundleId: selectedBundle.id,
          organizationId: selectedOrganization.id,
        },
      });

      if (fnError) throw fnError;
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

  // Not logged in - redirect to login with return URL
  const handleSignInRedirect = () => {
    const returnUrl = `/enterprise/expert-services${preSelectedBundleId ? `?bundleId=${preSelectedBundleId}` : ''}`;
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

  const isSubscription = selectedBundle?.billing_type === "recurring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isSubscription ? "Subscribe to Service" : "Purchase Service Credits"}
          </DialogTitle>
          <DialogDescription>
            {isSubscription 
              ? "Select a subscription plan and complete your signup."
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

          {/* Bundle selection */}
          {selectedOrganization && isAdmin && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Select a bundle</label>
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
                    
                    return (
                      <Card
                        key={bundle.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          selectedBundle?.id === bundle.id
                            ? "border-primary ring-1 ring-primary"
                            : "hover:border-primary/50",
                          !isConfigured && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => isConfigured && setSelectedBundle(bundle)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-full border-2",
                                selectedBundle?.id === bundle.id
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted"
                              )}
                            >
                              {selectedBundle?.id === bundle.id ? (
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
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Availability disclaimer before checkout */}
        {selectedBundle && selectedOrganization && isAdmin && (
          <AvailabilityDisclaimer className="mt-2" />
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedBundle || !selectedOrganization || !isAdmin || isProcessing}
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
