import { useParams, Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { TeamMembersCard } from "@/components/organization";

export default function OrgTeam() {
  const { slug } = useParams<{ slug: string }>();
  const { 
    organization, 
    teamMembers, 
    pendingInvitations,
    isAdmin, 
    isLoading, 
    notFound,
    refetchInvitations,
  } = useOrganizationDashboard(slug);

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage team members for {organization?.name}
        </p>
      </div>

      <div className="max-w-2xl">
        <TeamMembersCard 
          members={teamMembers} 
          loading={isLoading}
          organizationId={organization?.id}
          organizationName={organization?.name}
          isAdmin={isAdmin}
          pendingInvitations={pendingInvitations}
          onInviteSent={refetchInvitations}
        />
      </div>
    </div>
  );
}
