import { CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CloudSubscriptionStatus } from "@/hooks/useCloudBilling";

function statusLabel(status: string | null, cancelAtPeriodEnd: boolean): string {
  if (!status) return "No subscription";
  if (cancelAtPeriodEnd) return "Cancels at period end";
  if (status === "active" || status === "trialing") return "Active";
  if (status === "past_due") return "Past due";
  if (status === "paused") return "Paused";
  if (status === "canceled") return "Canceled";
  return status;
}

export function CloudBillingPanel({
  isLoading,
  error,
  planName,
  planStatus,
  subscription,
  canManage,
  hasOrganization,
  organizationLinked,
  onSubscribe,
  onManage,
  checkoutPending,
  portalPending,
}: {
  isLoading: boolean;
  error: Error | null;
  planName: string | null;
  planStatus: string | null;
  subscription: CloudSubscriptionStatus | null;
  canManage: boolean;
  hasOrganization: boolean;
  organizationLinked: boolean;
  onSubscribe: () => void;
  onManage: () => void;
  checkoutPending: boolean;
  portalPending: boolean;
}) {
  const hasPlan = Boolean(planName && planStatus && planStatus !== "canceled");
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

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && !hasPlan && (
          <p className="text-muted-foreground">
            {hasOrganization
              ? "No Elsa Cloud plan yet for this organization."
              : "No Elsa Cloud plan yet."}
          </p>
        )}

        {!isLoading && hasPlan && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{planName}</h3>
              <Badge variant={subscription?.cancelAtPeriodEnd ? "outline" : "default"}>
                {statusLabel(planStatus, subscription?.cancelAtPeriodEnd ?? false)}
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

        {!isLoading && !error && hasOrganization && !organizationLinked ? (
          <p className="text-sm text-muted-foreground">
            This organization is not linked to Elsa Cloud.
          </p>
        ) : !isLoading && canManage ? (
          <div className="flex flex-col sm:flex-row gap-3">
            {!hasPlan && (
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
            {hasPlan && (
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
          </div>
        ) : !isLoading && !error ? (
          <p className="text-sm text-muted-foreground">
            Only organization admins can start checkout or open the billing portal.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
