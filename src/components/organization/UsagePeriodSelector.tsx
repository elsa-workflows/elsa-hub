import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UsagePeriod, DateRange } from "@/lib/dateUtils";

interface UsagePeriodSelectorProps {
  period: UsagePeriod;
  customRange: DateRange | undefined;
  onPeriodChange: (period: UsagePeriod) => void;
  onCustomRangeChange: (range: DateRange) => void;
}

export function UsagePeriodSelector({
  period,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: UsagePeriodSelectorProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handlePeriodChange = (value: string) => {
    onPeriodChange(value as UsagePeriod);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current_month">This Month</SelectItem>
          <SelectItem value="previous_month">Last Month</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[130px] justify-start text-left font-normal",
                  !customRange?.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange?.start
                  ? format(customRange.start, "MMM d, yyyy")
                  : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange?.start}
                onSelect={(date) => {
                  if (date) {
                    onCustomRangeChange({
                      start: date,
                      end: customRange?.end || date,
                    });
                    setStartOpen(false);
                  }
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[130px] justify-start text-left font-normal",
                  !customRange?.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customRange?.end
                  ? format(customRange.end, "MMM d, yyyy")
                  : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customRange?.end}
                onSelect={(date) => {
                  if (date) {
                    onCustomRangeChange({
                      start: customRange?.start || date,
                      end: date,
                    });
                    setEndOpen(false);
                  }
                }}
                disabled={(date) =>
                  customRange?.start ? date < customRange.start : false
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
