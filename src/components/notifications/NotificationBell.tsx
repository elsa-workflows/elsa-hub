import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserInvitations } from "@/hooks/useUserInvitations";
import { InvitationCard } from "./InvitationCard";

export function NotificationBell() {
  const {
    invitations,
    isLoading,
    acceptInvitation,
    ignoreInvitation,
    isAccepting,
    isIgnoring,
  } = useUserInvitations();

  const count = invitations.length;

  if (isLoading || count === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
          <span className="sr-only">
            {count} pending invitation{count !== 1 ? "s" : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <p className="text-xs text-muted-foreground">
            {count} pending invitation{count !== 1 ? "s" : ""}
          </p>
        </div>
        <ScrollArea className="max-h-80">
          <div className="p-2 space-y-2">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={acceptInvitation}
                onIgnore={ignoreInvitation}
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
