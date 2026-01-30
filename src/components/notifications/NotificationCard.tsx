import { formatDistanceToNow } from "date-fns";
import { 
  UserPlus, 
  Clock, 
  ShoppingCart, 
  RefreshCw, 
  Phone,
  X,
  Check,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Notification, OrgInvitationPayload } from "@/types/notifications";

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptInvitation: (params: { notificationId: string; token: string }) => void;
  onIgnoreInvitation: (params: { notificationId: string; invitationId: string }) => void;
  isAccepting: boolean;
  isIgnoring: boolean;
}

// Get icon for notification type
function getNotificationIcon(type: string) {
  switch (type) {
    case "org_invitation":
    case "provider_invitation":
      return <UserPlus className="h-4 w-4 text-primary" />;
    case "work_logged":
      return <Clock className="h-4 w-4 text-primary/80" />;
    case "purchase_completed":
      return <ShoppingCart className="h-4 w-4 text-primary" />;
    case "subscription_renewed":
      return <RefreshCw className="h-4 w-4 text-primary/80" />;
    case "intro_call_submitted":
      return <Phone className="h-4 w-4 text-primary" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onDismiss,
  onAcceptInvitation,
  onIgnoreInvitation,
  isAccepting,
  isIgnoring,
}: NotificationCardProps) {
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  // Handle click on card (mark as read)
  const handleCardClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  // Render action buttons based on notification type
  const renderActions = () => {
    if (notification.type === "org_invitation" || notification.type === "provider_invitation") {
      const payload = notification.payload as unknown as OrgInvitationPayload;
      
      return (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAcceptInvitation({
                notificationId: notification.id,
                token: payload.token,
              });
            }}
            disabled={isAccepting || isIgnoring}
          >
            <Check className="h-3 w-3 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onIgnoreInvitation({
                notificationId: notification.id,
                invitationId: payload.invitation_id,
              });
            }}
            disabled={isAccepting || isIgnoring}
          >
            <X className="h-3 w-3 mr-1" />
            Ignore
          </Button>
        </div>
      );
    }

    // For other types, show a link if action_url exists
    if (notification.action_url) {
      return (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <a href={notification.action_url}>
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </a>
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50",
        isUnread && "border-l-2 border-l-primary bg-primary/5"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "text-sm line-clamp-1",
                isUnread ? "font-semibold" : "font-medium"
              )}>
                {notification.title}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(notification.id);
                }}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {timeAgo}
            </p>
            {renderActions()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
