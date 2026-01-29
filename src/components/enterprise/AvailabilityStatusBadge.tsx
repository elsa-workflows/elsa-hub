import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface AvailabilityStatusBadgeProps {
  status: string | null;
  estimatedLeadTimeDays?: number | null;
}

export function AvailabilityStatusBadge({ status, estimatedLeadTimeDays }: AvailabilityStatusBadgeProps) {
  if (!status || status === "available") {
    return null;
  }

  if (status === "limited") {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Limited Availability
      </Badge>
    );
  }

  if (status === "high_demand") {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        High Demand{estimatedLeadTimeDays ? ` · ${estimatedLeadTimeDays} day lead time` : ""}
      </Badge>
    );
  }

  return null;
}
