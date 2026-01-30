import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCard } from "./NotificationCard";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    dismiss,
    acceptInvitation,
    ignoreInvitation,
    isAccepting,
    isIgnoring,
  } = useNotifications();

  // Don't show bell if loading or no notifications
  if (isLoading || notifications.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up!"}
          </p>
        </div>
        <ScrollArea className="max-h-96">
          <div className="p-2 space-y-2">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDismiss={dismiss}
                onAcceptInvitation={acceptInvitation}
                onIgnoreInvitation={ignoreInvitation}
                isAccepting={isAccepting}
                isIgnoring={isIgnoring}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
