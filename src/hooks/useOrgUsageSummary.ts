import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPeriodRange, UsagePeriod, DateRange } from "@/lib/dateUtils";
import type { Database } from "@/integrations/supabase/types";

type WorkCategory = Database["public"]["Enums"]["work_category"];

export interface CategoryBreakdown {
  minutes: number;
  count: number;
}

export interface UsageSummaryData {
  totalMinutesConsumed: number;
  entryCount: number;
  periodStart: Date;
  periodEnd: Date;
  byCategory: Record<WorkCategory, CategoryBreakdown>;
}

export function useOrgUsageSummary(
  organizationId: string | undefined,
  period: UsagePeriod = "current_month",
  customRange?: DateRange,
  serviceProviderId?: string
) {
  const { start, end } = getPeriodRange(period, customRange);

  return useQuery({
    queryKey: [
      "org-usage-summary",
      organizationId,
      period,
      customRange?.start?.toISOString(),
      customRange?.end?.toISOString(),
      serviceProviderId,
    ],
    queryFn: async (): Promise<UsageSummaryData> => {
      if (!organizationId) {
        return {
          totalMinutesConsumed: 0,
          entryCount: 0,
          periodStart: start,
          periodEnd: end,
          byCategory: {} as Record<WorkCategory, CategoryBreakdown>,
        };
      }

      let query = supabase
        .from("work_logs")
        .select("minutes_spent, category")
        .eq("organization_id", organizationId)
        .gte("performed_at", start.toISOString())
        .lt("performed_at", end.toISOString());

      if (serviceProviderId) {
        query = query.eq("service_provider_id", serviceProviderId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by category
      const byCategory: Record<WorkCategory, CategoryBreakdown> = {} as Record<WorkCategory, CategoryBreakdown>;
      let totalMinutesConsumed = 0;
      let entryCount = 0;

      for (const log of data || []) {
        totalMinutesConsumed += log.minutes_spent;
        entryCount += 1;

        const cat = log.category as WorkCategory;
        if (!byCategory[cat]) {
          byCategory[cat] = { minutes: 0, count: 0 };
        }
        byCategory[cat].minutes += log.minutes_spent;
        byCategory[cat].count += 1;
      }

      return {
        totalMinutesConsumed,
        entryCount,
        periodStart: start,
        periodEnd: end,
        byCategory,
      };
    },
    enabled: !!organizationId,
  });
}
