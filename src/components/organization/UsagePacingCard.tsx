import { useQuery } from "@tanstack/react-query";
import { Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface UsagePacingCardProps {
  organizationId: string;
  serviceProviderId?: string;
}

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

export function UsagePacingCard({ organizationId, serviceProviderId }: UsagePacingCardProps) {
  // Fetch current month's usage
  const usageQuery = useQuery({
    queryKey: ["monthly-usage", organizationId, serviceProviderId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      let query = supabase
        .from("work_logs")
        .select("minutes_spent")
        .eq("organization_id", organizationId)
        .gte("performed_at", startOfMonth)
        .lt("performed_at", endOfMonth);

      if (serviceProviderId) {
        query = query.eq("service_provider_id", serviceProviderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.reduce((sum, log) => sum + log.minutes_spent, 0) || 0;
    },
    enabled: !!organizationId,
  });

  // Fetch recommended monthly minutes from active bundles/lots
  const recommendedQuery = useQuery({
    queryKey: ["recommended-usage", organizationId, serviceProviderId],
    queryFn: async () => {
      // Get active lots with their bundles
      let lotsQuery = supabase
        .from("credit_lots")
        .select("order_id, subscription_id")
        .eq("organization_id", organizationId)
        .eq("status", "active");

      if (serviceProviderId) {
        lotsQuery = lotsQuery.eq("service_provider_id", serviceProviderId);
      }

      const { data: lots, error: lotsError } = await lotsQuery;
      if (lotsError) throw lotsError;

      if (!lots || lots.length === 0) return null;

      // Get order IDs that have lots
      const orderIds = lots.map(l => l.order_id).filter(Boolean) as string[];
      
      if (orderIds.length === 0) return null;

      // Get bundles from orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("credit_bundle_id")
        .in("id", orderIds);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return null;

      const bundleIds = [...new Set(orders.map(o => o.credit_bundle_id))];

      // Get recommended minutes from bundles
      const { data: bundles, error: bundlesError } = await supabase
        .from("credit_bundles")
        .select("recommended_monthly_minutes, monthly_consumption_cap_minutes")
        .in("id", bundleIds);

      if (bundlesError) throw bundlesError;

      // Return the highest recommended value (or cap if no recommendation)
      let maxRecommended = 0;
      let maxCap = 0;
      
      bundles?.forEach(bundle => {
        if (bundle.recommended_monthly_minutes && bundle.recommended_monthly_minutes > maxRecommended) {
          maxRecommended = bundle.recommended_monthly_minutes;
        }
        if (bundle.monthly_consumption_cap_minutes && bundle.monthly_consumption_cap_minutes > maxCap) {
          maxCap = bundle.monthly_consumption_cap_minutes;
        }
      });

      return {
        recommended: maxRecommended || null,
        cap: maxCap || null,
      };
    },
    enabled: !!organizationId,
  });

  const monthlyUsage = usageQuery.data || 0;
  const recommended = recommendedQuery.data?.recommended;
  const cap = recommendedQuery.data?.cap;

  // If no recommended value, don't show the card
  if (!recommended && !cap) {
    return null;
  }

  const displayLimit = recommended || cap || 0;
  const usagePercent = displayLimit > 0 ? Math.min((monthlyUsage / displayLimit) * 100, 100) : 0;
  const isExceeded = monthlyUsage > displayLimit;
  const isWarning = usagePercent >= 75 && !isExceeded;

  // Color coding
  const progressColor = isExceeded 
    ? "bg-destructive" 
    : isWarning 
      ? "bg-warning" 
      : "bg-primary";

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          {currentMonth} Usage Pacing
        </CardTitle>
        <CardDescription>
          Track your credit usage against recommended limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold">{minutesToHours(monthlyUsage)}h</span>
            <span className="text-muted-foreground ml-2">used this month</span>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {recommended ? "Recommended" : "Cap"}: {minutesToHours(displayLimit)}h
          </div>
        </div>

        <div className="space-y-2">
          <Progress 
            value={usagePercent} 
            className="h-3"
            style={{
              // @ts-expect-error - custom CSS variable
              "--progress-background": isExceeded 
                ? "hsl(var(--destructive))" 
                : isWarning 
                  ? "hsl(var(--warning))"
                  : undefined
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{usagePercent.toFixed(0)}% of {recommended ? "recommended" : "cap"}</span>
            <span>
              {minutesToHours(Math.max(0, displayLimit - monthlyUsage))}h remaining
            </span>
          </div>
        </div>

        {isExceeded && (
          <Alert className="border-warning/50 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              You've exceeded the {recommended ? "recommended" : "maximum"} monthly usage 
              ({minutesToHours(displayLimit)}h). Scheduling may be affected.
            </AlertDescription>
          </Alert>
        )}

        {isWarning && !isExceeded && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Approaching recommended limit — consider pacing usage through the month.
          </p>
        )}
      </CardContent>
    </Card>
  );
}