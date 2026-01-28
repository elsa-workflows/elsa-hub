import { useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Crown, ShieldCheck, User, Clock, Mail } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrganizationDashboard, TeamMember } from "@/hooks/useOrganizationDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { InviteMemberDialog, RemoveMemberDialog, RoleSelect } from "@/components/organization";

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

function getDisplayName(member: TeamMember): string {
  if (member.display_name) return member.display_name;
  if (member.email) return member.email;
  return `${member.user_id.slice(0, 8)}...`;
}

export default function OrgTeam() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { 
    organization, 
    teamMembers, 
    pendingInvitations,
    isAdmin, 
    isLoading, 
    notFound,
    refetchInvitations,
  } = useOrganizationDashboard(slug);

  const refetchTeam = () => {
    queryClient.invalidateQueries({ queryKey: ["team-members", organization?.id] });
  };

  if (notFound && !isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This organization doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const ownerCount = teamMembers.filter(m => m.role === "owner").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage team members for {organization?.name}
          </p>
        </div>
        {isAdmin && organization && (
          <InviteMemberDialog
            organizationId={organization.id}
            organizationName={organization.name}
            onInviteSent={refetchInvitations}
          />
        )}
      </div>

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Active Members
          </CardTitle>
          <CardDescription>
            {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} with access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const isOwner = member.role === "owner";
                const canRemove = isAdmin && !isCurrentUser && !isOwner;
                const canChangeRole = isAdmin && !isOwner && !(isOwner && ownerCount === 1);

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {getDisplayName(member)}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Joined {format(new Date(member.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {canChangeRole ? (
                        <RoleSelect
                          memberId={member.id}
                          currentRole={member.role}
                          onRoleChanged={refetchTeam}
                        />
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          {roleIcons[member.role]}
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      )}
                      {canRemove && organization && (
                        <RemoveMemberDialog
                          memberId={member.id}
                          memberName={getDisplayName(member)}
                          organizationName={organization.name}
                          onRemoved={refetchTeam}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? "s" : ""} awaiting response
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {format(new Date(invite.expires_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      {roleIcons[invite.role]}
                      {roleLabels[invite.role] || invite.role}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                      Pending
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
