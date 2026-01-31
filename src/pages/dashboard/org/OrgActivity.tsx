import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  Clock,
  Receipt,
  Coins,
  Users,
  Mail,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgAuditEvents } from "@/hooks/useOrgAuditEvents";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { cn } from "@/lib/utils";

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Activity" },
  { value: "work_log", label: "Work Logs" },
  { value: "order", label: "Orders" },
  { value: "credit_lot", label: "Credits" },
  { value: "credit_adjustment", label: "Adjustments" },
  { value: "subscription", label: "Subscriptions" },
  { value: "invitation", label: "Invitations" },
  { value: "organization_member", label: "Team Changes" },
];

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case "work_log":
      return Clock;
    case "order":
      return Receipt;
    case "credit_lot":
    case "credit_adjustment":
      return Coins;
    case "invitation":
      return Mail;
    case "organization_member":
      return Users;
    case "subscription":
      return RefreshCw;
    default:
      return Clock;
  }
};

const getEntityColor = (entityType: string) => {
  switch (entityType) {
    case "work_log":
      return "text-blue-500 bg-blue-500/10";
    case "order":
      return "text-green-500 bg-green-500/10";
    case "credit_lot":
    case "credit_adjustment":
      return "text-amber-500 bg-amber-500/10";
    case "invitation":
      return "text-purple-500 bg-purple-500/10";
    case "organization_member":
      return "text-indigo-500 bg-indigo-500/10";
    case "subscription":
      return "text-cyan-500 bg-cyan-500/10";
    default:
      return "text-muted-foreground bg-muted";
  }
};

const formatEventDate = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

interface GroupedEvents {
  [date: string]: Array<{
    id: string;
    actor_type: "user" | "system";
    actor_display_name: string;
    entity_type: string;
    action: string;
    summary: string;
    created_at: string;
  }>;
}

export default function OrgActivity() {
  const { slug } = useParams<{ slug: string }>();
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { organization, isAdmin, isLoading: orgLoading } = useOrganizationDashboard(slug);

  const { data: events = [], isLoading: eventsLoading } = useOrgAuditEvents(
    organization?.id,
    {
      limit: 100,
      entityType: entityFilter === "all" ? null : entityFilter,
    }
  );

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: GroupedEvents = {};
    events.forEach((event) => {
      const dateKey = formatEventDate(event.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  }, [events]);

  const dateGroups = Object.keys(groupedEvents);

  if (orgLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground">Recent activity in your organization</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Only organization admins can view the activity log.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground">Recent activity in your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg">Timeline</CardTitle>
          <CardDescription>
            Activity events are shown in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {eventsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No activity recorded yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Activity will appear here when actions are performed
              </p>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {dateGroups.map((dateGroup) => (
                <div key={dateGroup}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 md:mb-4">
                    {dateGroup}
                  </h3>
                  <div className="space-y-4">
                    {groupedEvents[dateGroup].map((event) => {
                      const Icon = getEntityIcon(event.entity_type);
                      const colorClasses = getEntityColor(event.entity_type);

                      return (
                        <div
                          key={event.id}
                          className="flex gap-3 items-start"
                        >
                          {/* Timeline icon */}
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              colorClasses
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Event content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                                {event.entity_type.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(event.created_at), "h:mm a")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm break-words">{event.summary}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              by {event.actor_display_name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
