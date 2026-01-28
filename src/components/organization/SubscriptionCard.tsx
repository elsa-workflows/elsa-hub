import { useState } from "react";
import { format } from "date-fns";
import { CreditCard, Calendar, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Subscription } from "@/hooks/useSubscriptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
  subscriptions: Subscription[];
  loading?: boolean;
  isAdmin?: boolean;
  organizationId?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  past_due: { label: "Past Due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "secondary" },
  paused: { label: "Paused", variant: "outline" },
};

export function SubscriptionCard({ subscriptions, loading, isAdmin, organizationId }: SubscriptionCardProps) {
  const [managingPortal, setManagingPortal] = useState(false);
  
  const activeSubscriptions = subscriptions.filter(s => s.status === "active" || s.status === "past_due");

  const handleManageSubscription = async () => {
    if (!organizationId) return;
    
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { organizationId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No portal URL returned");

      window.open(data.url, "_blank");
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Failed to open subscription management", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setManagingPortal(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Active Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeSubscriptions.length === 0) {
    return null; // Don't show the card if no active subscriptions
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Active Subscriptions
        </CardTitle>
        {isAdmin && activeSubscriptions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
            disabled={managingPortal}
          >
            {managingPortal ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSubscriptions.map(subscription => {
          const status = statusConfig[subscription.status] || statusConfig.active;
          const renewalDate = subscription.current_period_end 
            ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
            : "—";
          
          return (
            <div
              key={subscription.id}
              className={cn(
                "p-4 rounded-lg border",
                subscription.status === "active" && "border-primary/30 bg-primary/5",
                subscription.status === "past_due" && "border-destructive/30 bg-destructive/5",
                subscription.status === "canceled" && "border-muted"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{subscription.bundle_name}</h4>
                  <Badge variant={status.variant} className="mt-1">
                    {status.label}
                    {subscription.cancel_at_period_end && " (Canceling)"}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{subscription.monthly_hours} hours/month</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {subscription.cancel_at_period_end ? "Ends" : "Renews"}: {renewalDate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
