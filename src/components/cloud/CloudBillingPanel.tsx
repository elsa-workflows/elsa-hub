import { CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CloudSubscriptionStatus } from "@/hooks/useCloudBilling";
import { ENDED_SUBSCRIPTION_STATUSES } from "@/lib/cloud/billingContract";
import { cloudPlanStatusLabel } from "@/lib/cloud/billingDisplay";
import {
  CLOUD_BILLING_NEEDS_LINK,
  CLOUD_BILLING_NO_CUSTOMER,
  CLOUD_ERROR_RETRY,
  CLOUD_PREVIEW_LIMITS_HEADING,
  CLOUD_PREVIEW_ONE_USER,
} from "@/lib/cloudClient";

export function CloudBillingPanel({
  isLoading,
  error,
  planName,
  planStatus,
  subscription,
  canManage,
  hasOrganization,
  billingAccount,
  cloudLink,
  onSubscribe,
  onManage,
  onRetry,
  checkoutPending,
  portalPending,
  needsLink = false,
  unavailable = false,
  cloudHomeHref,
}: {
  isLoading: boolean;
  error: Error | null;
  planName: string | null;
  planStatus: string | null;
  subscription: CloudSubscriptionStatus | null;
  canManage: boolean;
  hasOrganization: boolean;
  billingAccount: "missing" | "linked";
  cloudLink: "missing" | "linked";
  onSubscribe: () => void;
  onManage: () => void;
  onRetry?: () => void;
  checkoutPending: boolean;
  portalPending: boolean;
  needsLink?: boolean;
  unavailable?: boolean;
  cloudHomeHref?: string;
}) {
  const hasPlan = Boolean(planName && planStatus && !ENDED_SUBSCRIPTION_STATUSES.includes(planStatus));
  const linkedToControl = cloudLink === "linked";
  const hasStoredCustomer = billingAccount === "linked";
  const periodEnd = subscription?.currentPeriodEnd
    ? format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Elsa Cloud billing
        </CardTitle>
        <CardDescription>
          Signed-in billing stays on this page. Manage or cancel through the Hub billing portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading billing…
          </div>
        )}

        {error?.message ? (
          <Alert variant="destructive">
            <AlertDescription className="space-y-3">
              <p>{error.message}</p>
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  {CLOUD_ERROR_RETRY}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {!hasOrganization && (
          <p className="text-muted-foreground">
            Elsa Cloud billing belongs to an organization. Create or join one to subscribe.
          </p>
        )}

        {hasOrganization && !isLoading && !error && !unavailable && !hasPlan && (
          <p className="text-muted-foreground">No Elsa Cloud plan yet for this organization.</p>
        )}

        {!isLoading && hasPlan && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{planName}</h3>
              <Badge variant={subscription?.cancelAtPeriodEnd ? "outline" : "default"}>
                {cloudPlanStatusLabel(planStatus, subscription?.cancelAtPeriodEnd ?? false)}
              </Badge>
            </div>
            {periodEnd && (
              <p className="text-sm text-muted-foreground">
                {subscription?.cancelAtPeriodEnd
                  ? `Access and billing continue until ${periodEnd}. Canceling does not delete engines.`
                  : `Renews ${periodEnd}.`}
              </p>
            )}
          </div>
        )}

        {canManage && !unavailable && (linkedToControl || hasPlan || hasStoredCustomer) ? (
          <div className="flex flex-col sm:flex-row gap-3">
            {linkedToControl && !hasPlan && (
              <Button
                type="button"
                onClick={onSubscribe}
                disabled={checkoutPending}
                className="min-h-11"
              >
                {checkoutPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Subscribe to Elsa Cloud
              </Button>
            )}
            {hasStoredCustomer && (
              <Button
                type="button"
                variant="outline"
                onClick={onManage}
                disabled={portalPending}
                className="min-h-11"
              >
                {portalPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Manage or cancel billing
              </Button>
            )}
            {hasPlan && !hasStoredCustomer && (
              <p className="text-sm text-muted-foreground">{CLOUD_BILLING_NO_CUSTOMER}</p>
            )}
          </div>
        ) : canManage && hasOrganization && !isLoading && !error && needsLink ? (
          <p className="text-sm text-muted-foreground">
            {cloudHomeHref ? (
              <Link to={cloudHomeHref} className="text-primary underline underline-offset-4">
                {CLOUD_BILLING_NEEDS_LINK}
              </Link>
            ) : (
              CLOUD_BILLING_NEEDS_LINK
            )}
          </p>
        ) : canManage && hasOrganization && !linkedToControl && !isLoading && !error && !unavailable ? (
          <p className="text-sm text-muted-foreground">
            This organization is not linked to Elsa Cloud. Checkout is unavailable until the
            Hub-to-Control organization link is validated.
          </p>
        ) : null}

        {hasOrganization && !isLoading && !unavailable && (
          <div className="space-y-1">
            <p className="text-sm font-medium">{CLOUD_PREVIEW_LIMITS_HEADING}</p>
            <p className="text-sm text-muted-foreground">{CLOUD_PREVIEW_ONE_USER}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
