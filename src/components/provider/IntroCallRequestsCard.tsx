import { useState } from "react";
import { format } from "date-fns";
import { Phone, Mail, Building2, Calendar, ChevronDown, ChevronUp, Clock, Archive } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useIntroCallRequests,
  getProjectStageLabel,
  type IntroCallRequest,
  type IntroCallStatus,
} from "@/hooks/useIntroCallRequests";
import { toast } from "sonner";

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "pending":
      return "default";
    case "scheduled":
      return "secondary";
    case "completed":
      return "outline";
    case "declined":
      return "destructive";
    default:
      return "outline";
  }
}

function RequestRow({ request, onStatusChange, onArchive, isUpdating, isArchiving }: {
  request: IntroCallRequest;
  onStatusChange: (requestId: string, status: IntroCallStatus) => void;
  onArchive: (requestId: string) => void;
  isUpdating: boolean;
  isArchiving: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(request.id, newStatus as IntroCallStatus);
  };

  const handleArchive = () => {
    onArchive(request.id);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{request.full_name}</p>
              <p className="text-sm text-muted-foreground truncate">{request.company_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Select
              value={request.status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleArchive}
              disabled={isArchiving}
              title="Archive request"
            >
              <Archive className="h-4 w-4" />
            </Button>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={getStatusBadgeVariant(request.status)}>
            {request.status}
          </Badge>
          <Badge variant="outline">
            {getProjectStageLabel(request.project_stage)}
          </Badge>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(request.created_at), "MMM d, yyyy")}
          </span>
        </div>

        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${request.email}`}
                className="text-primary hover:underline"
              >
                {request.email}
              </a>
            </div>
            {request.scheduled_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Scheduled: {format(new Date(request.scheduled_at), "PPp")}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">How they're using Elsa:</p>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {request.current_usage}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">What they want to discuss:</p>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {request.discussion_topics}
            </p>
          </div>

          {request.interests && request.interests.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Areas of interest:</p>
              <div className="flex flex-wrap gap-1">
                {request.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-xs">
                    {interest.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {request.internal_notes && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Internal Notes:</p>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {request.internal_notes}
              </p>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function IntroCallRequestsCard() {
  const { requests, isLoading, updateStatus, isUpdating, archiveRequest, isArchiving } = useIntroCallRequests();

  const handleStatusChange = (requestId: string, status: IntroCallStatus) => {
    updateStatus(
      { requestId, status },
      {
        onSuccess: () => {
          toast.success(`Request marked as ${status}`);
        },
        onError: (error) => {
          toast.error("Failed to update status");
          console.error("Status update error:", error);
        },
      }
    );
  };

  const handleArchive = (requestId: string) => {
    archiveRequest(requestId, {
      onSuccess: () => {
        toast.success("Request archived");
      },
      onError: (error) => {
        toast.error("Failed to archive request");
        console.error("Archive error:", error);
      },
    });
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Intro Call Requests
              {pendingCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manage introductory call requests from potential customers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No intro call requests</p>
            <p className="text-sm mt-1">Requests will appear when submitted via the website.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                onStatusChange={handleStatusChange}
                onArchive={handleArchive}
                isUpdating={isUpdating}
                isArchiving={isArchiving}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
