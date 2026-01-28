import { useParams, Link } from "react-router-dom";
import { Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { LeaveOrganizationDialog, DeleteOrganizationDialog } from "@/components/organization";

export default function OrgSettings() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { organization, teamMembers, isLoading, notFound, isAdmin } = useOrganizationDashboard(slug);

  // Find current user's role
  const currentMember = teamMembers.find(m => m.user_id === user?.id);
  const userRole = currentMember?.role || "member";
  const isOwner = userRole === "owner";

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
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage settings for {organization?.name}
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-5 bg-muted/50 animate-pulse rounded w-32" />
                <div className="h-5 bg-muted/50 animate-pulse rounded w-48" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{organization?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">URL Slug</p>
                  <p className="font-medium font-mono text-sm">/{organization?.slug}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Leave Organization */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Leave Organization</p>
                <p className="text-sm text-muted-foreground">
                  {isOwner 
                    ? "Owners cannot leave. Transfer ownership first or delete the organization."
                    : "Remove yourself from this organization"}
                </p>
              </div>
              {organization && (
                <LeaveOrganizationDialog
                  organizationId={organization.id}
                  organizationName={organization.name}
                  userRole={userRole}
                />
              )}
            </div>
            
            {/* Delete Organization (owner only) */}
            {isOwner && (
              <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                <div>
                  <p className="font-medium text-destructive">Delete Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this organization and all its data
                  </p>
                </div>
                {organization && (
                  <DeleteOrganizationDialog
                    organizationId={organization.id}
                    organizationName={organization.name}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
