import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface ProviderUsageSummary {
  thisMonth: {
    totalMinutes: number;
    entryCount: number;
    activeCustomers: number;
  };
  lastMonth: {
    totalMinutes: number;
    entryCount: number;
  };
  topCustomers: Array<{
    organizationId: string;
    organizationName: string;
    minutesThisMonth: number;
  }>;
}

export function useProviderUsageSummary(providerId: string | undefined) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonth = subMonths(now, 1);
  const lastMonthStart = startOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);

  return useQuery({
    queryKey: ["provider-usage-summary", providerId],
    queryFn: async (): Promise<ProviderUsageSummary> => {
      if (!providerId) {
        return {
          thisMonth: { totalMinutes: 0, entryCount: 0, activeCustomers: 0 },
          lastMonth: { totalMinutes: 0, entryCount: 0 },
          topCustomers: [],
        };
      }

      // Fetch this month's work logs
      const { data: thisMonthLogs, error: thisMonthError } = await supabase
        .from("work_logs")
        .select("minutes_spent, organization_id")
        .eq("service_provider_id", providerId)
        .gte("performed_at", thisMonthStart.toISOString())
        .lt("performed_at", thisMonthEnd.toISOString());

      if (thisMonthError) throw thisMonthError;

      // Fetch last month's work logs
      const { data: lastMonthLogs, error: lastMonthError } = await supabase
        .from("work_logs")
        .select("minutes_spent")
        .eq("service_provider_id", providerId)
        .gte("performed_at", lastMonthStart.toISOString())
        .lt("performed_at", lastMonthEnd.toISOString());

      if (lastMonthError) throw lastMonthError;

      // Aggregate this month
      const orgMinutes: Record<string, number> = {};
      let thisMonthTotal = 0;
      const activeOrgIds = new Set<string>();

      for (const log of thisMonthLogs || []) {
        thisMonthTotal += log.minutes_spent;
        activeOrgIds.add(log.organization_id);
        orgMinutes[log.organization_id] = (orgMinutes[log.organization_id] || 0) + log.minutes_spent;
      }

      // Aggregate last month
      let lastMonthTotal = 0;
      for (const log of lastMonthLogs || []) {
        lastMonthTotal += log.minutes_spent;
      }

      // Get top 5 customers by usage
      const sortedOrgs = Object.entries(orgMinutes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Fetch organization names
      let topCustomers: ProviderUsageSummary["topCustomers"] = [];
      if (sortedOrgs.length > 0) {
        const orgIds = sortedOrgs.map(([id]) => id);
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);

        const orgNameMap = new Map(orgs?.map((o) => [o.id, o.name]) || []);

        topCustomers = sortedOrgs.map(([id, minutes]) => ({
          organizationId: id,
          organizationName: orgNameMap.get(id) || "Unknown",
          minutesThisMonth: minutes,
        }));
      }

      return {
        thisMonth: {
          totalMinutes: thisMonthTotal,
          entryCount: thisMonthLogs?.length || 0,
          activeCustomers: activeOrgIds.size,
        },
        lastMonth: {
          totalMinutes: lastMonthTotal,
          entryCount: lastMonthLogs?.length || 0,
        },
        topCustomers,
      };
    },
    enabled: !!providerId,
  });
}
