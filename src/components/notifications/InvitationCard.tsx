import { format } from "date-fns";
import { Building2, Clock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserInvitation } from "@/hooks/useUserInvitations";

interface InvitationCardProps {
  invitation: UserInvitation;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  isAccepting?: boolean;
  isIgnoring?: boolean;
}

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <ShieldCheck className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
};

export function InvitationCard({
  invitation,
  onAccept,
  onIgnore,
  isAccepting,
  isIgnoring,
}: InvitationCardProps) {
  const isPending = isAccepting || isIgnoring;

  return (
    <div className="p-3 rounded-lg border bg-card text-card-foreground">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {invitation.organization_name}
          </p>
          <div className="text-xs text-muted-foreground">
            You're invited to join as{" "}
            <Badge variant="secondary" className="ml-1 gap-1 text-xs py-0 px-1.5">
              {roleIcons[invitation.role]}
              {roleLabels[invitation.role] || invitation.role}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Expires {format(new Date(invitation.expires_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onAccept(invitation.id)}
          disabled={isPending}
        >
          {isAccepting ? "Joining..." : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onIgnore(invitation.id)}
          disabled={isPending}
        >
          {isIgnoring ? "Ignoring..." : "Ignore"}
        </Button>
      </div>
    </div>
  );
}
