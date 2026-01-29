import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from "date-fns";

export type UsagePeriod = "current_month" | "previous_month" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getPeriodRange(period: UsagePeriod, customRange?: DateRange): DateRange {
  const now = new Date();
  
  switch (period) {
    case "current_month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case "previous_month":
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    case "custom":
      if (!customRange) {
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      }
      return customRange;
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

export function getQuarterRange(): DateRange {
  const now = new Date();
  return {
    start: startOfQuarter(now),
    end: endOfQuarter(now),
  };
}

export function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}
