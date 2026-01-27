import { Users, Crown, ShieldCheck, User, Clock, Mail } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "./InviteMemberDialog";
import type { TeamMember } from "@/hooks/useOrganizationDashboard";

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  status: string;
}

interface TeamMembersCardProps {
  members: TeamMember[];
  loading?: boolean;
  organizationId?: string;
  organizationName?: string;
  isAdmin?: boolean;
  pendingInvitations?: PendingInvitation[];
  onInviteSent?: () => void;
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
};

const roleLabels: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function truncateUuid(uuid: string): string {
  return `${uuid.slice(0, 8)}...`;
}

export function TeamMembersCard({ 
  members, 
  loading,
  organizationId,
  organizationName,
  isAdmin = false,
  pendingInvitations = [],
  onInviteSent,
}: TeamMembersCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCount = members.length + pendingInvitations.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Members
          </CardTitle>
          {isAdmin && organizationId && organizationName && (
            <InviteMemberDialog
              organizationId={organizationId}
              organizationName={organizationName}
              onInviteSent={onInviteSent}
            />
          )}
        </div>
        <CardDescription>
          {members.length} member{members.length !== 1 ? "s" : ""}
          {pendingInvitations.length > 0 && ` • ${pendingInvitations.length} pending`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No team members.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active members */}
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm font-mono">
                      {truncateUuid(member.user_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {format(new Date(member.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  {roleIcons[member.role]}
                  {roleLabels[member.role] || member.role}
                </Badge>
              </div>
            ))}
            
            {/* Pending invitations */}
            {pendingInvitations.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{invite.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires {format(new Date(invite.expires_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
