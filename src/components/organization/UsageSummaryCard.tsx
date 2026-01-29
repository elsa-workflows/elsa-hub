import { useState } from "react";
import { format } from "date-fns";
import { Clock, FileText, Coins, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UsagePeriodSelector } from "./UsagePeriodSelector";
import { useOrgUsageSummary, CategoryBreakdown } from "@/hooks/useOrgUsageSummary";
import { minutesToHours } from "@/lib/dateUtils";
import type { UsagePeriod, DateRange } from "@/lib/dateUtils";
import type { Database } from "@/integrations/supabase/types";

type WorkCategory = Database["public"]["Enums"]["work_category"];

const categoryLabels: Record<WorkCategory, string> = {
  development: "Development",
  consulting: "Consulting",
  training: "Training",
  support: "Support",
  other: "Other",
};

interface UsageSummaryCardProps {
  organizationId: string | undefined;
  availableMinutes: number;
  serviceProviderId?: string;
  onViewDetails?: () => void;
}

export function UsageSummaryCard({
  organizationId,
  availableMinutes,
  serviceProviderId,
  onViewDetails,
}: UsageSummaryCardProps) {
  const [period, setPeriod] = useState<UsagePeriod>("current_month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const { data, isLoading } = useOrgUsageSummary(
    organizationId,
    period,
    customRange,
    serviceProviderId
  );

  const periodLabel =
    period === "current_month"
      ? "This Month"
      : period === "previous_month"
      ? "Last Month"
      : customRange
      ? `${format(customRange.start, "MMM d")} - ${format(customRange.end, "MMM d, yyyy")}`
      : "Custom";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Usage Summary</CardTitle>
            <CardDescription>Credits consumed {periodLabel.toLowerCase()}</CardDescription>
          </div>
          <UsagePeriodSelector
            period={period}
            customRange={customRange}
            onPeriodChange={setPeriod}
            onCustomRangeChange={setCustomRange}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold">
                  {minutesToHours(data?.totalMinutesConsumed || 0)}h
                </p>
              )}
              <p className="text-sm text-muted-foreground">consumed</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
            <div className="p-2 rounded-full bg-secondary/50">
              <FileText className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className="text-2xl font-bold">{data?.entryCount || 0}</p>
              )}
              <p className="text-sm text-muted-foreground">entries</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30">
            <div className="p-2 rounded-full bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {minutesToHours(availableMinutes)}h
              </p>
              <p className="text-sm text-muted-foreground">remaining</p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {data && Object.keys(data.byCategory).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">By Category</h4>
            <div className="space-y-2">
              {(Object.entries(data.byCategory) as [WorkCategory, CategoryBreakdown][])
                .sort((a, b) => b[1].minutes - a[1].minutes)
                .map(([category, breakdown]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/20"
                  >
                    <span className="font-medium">{categoryLabels[category]}</span>
                    <span className="text-muted-foreground">
                      {minutesToHours(breakdown.minutes)}h ({breakdown.count} entries)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* View Details Link */}
        {onViewDetails && (
          <Button variant="ghost" onClick={onViewDetails} className="w-full justify-between">
            View Work Log Details
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
