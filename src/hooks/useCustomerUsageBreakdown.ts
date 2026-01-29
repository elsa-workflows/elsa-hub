import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter } from "date-fns";

export interface CustomerUsageRow {
  organizationId: string;
  organizationName: string;
  thisMonthMinutes: number;
  lastMonthMinutes: number;
  thisQuarterMinutes: number;
  trend: "up" | "down" | "same" | "new";
  trendPercent: number | null;
}

export function useCustomerUsageBreakdown(providerId: string | undefined) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = startOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);
  const quarterStart = startOfQuarter(now);

  return useQuery({
    queryKey: ["customer-usage-breakdown", providerId],
    queryFn: async (): Promise<CustomerUsageRow[]> => {
      if (!providerId) return [];

      // Fetch all work logs for this quarter (covers this month, last month, and quarter)
      const { data: logs, error } = await supabase
        .from("work_logs")
        .select("minutes_spent, organization_id, performed_at")
        .eq("service_provider_id", providerId)
        .gte("performed_at", quarterStart.toISOString())
        .lt("performed_at", thisMonthEnd.toISOString());

      if (error) throw error;

      // Aggregate by organization and time period
      const orgData: Record<
        string,
        { thisMonth: number; lastMonth: number; quarter: number }
      > = {};

      for (const log of logs || []) {
        const orgId = log.organization_id;
        const performedAt = new Date(log.performed_at);

        if (!orgData[orgId]) {
          orgData[orgId] = { thisMonth: 0, lastMonth: 0, quarter: 0 };
        }

        orgData[orgId].quarter += log.minutes_spent;

        if (performedAt >= thisMonthStart && performedAt < thisMonthEnd) {
          orgData[orgId].thisMonth += log.minutes_spent;
        } else if (performedAt >= lastMonthStart && performedAt < lastMonthEnd) {
          orgData[orgId].lastMonth += log.minutes_spent;
        }
      }

      // Fetch organization names
      const orgIds = Object.keys(orgData);
      if (orgIds.length === 0) return [];

      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);

      const orgNameMap = new Map(orgs?.map((o) => [o.id, o.name]) || []);

      // Build result rows
      return orgIds
        .map((orgId) => {
          const data = orgData[orgId];
          let trend: CustomerUsageRow["trend"] = "same";
          let trendPercent: number | null = null;

          if (data.lastMonth === 0 && data.thisMonth > 0) {
            trend = "new";
          } else if (data.lastMonth > 0) {
            const change = ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100;
            trendPercent = Math.round(change);
            if (change > 5) trend = "up";
            else if (change < -5) trend = "down";
          }

          return {
            organizationId: orgId,
            organizationName: orgNameMap.get(orgId) || "Unknown",
            thisMonthMinutes: data.thisMonth,
            lastMonthMinutes: data.lastMonth,
            thisQuarterMinutes: data.quarter,
            trend,
            trendPercent,
          };
        })
        .sort((a, b) => b.thisMonthMinutes - a.thisMonthMinutes);
    },
    enabled: !!providerId,
  });
}
