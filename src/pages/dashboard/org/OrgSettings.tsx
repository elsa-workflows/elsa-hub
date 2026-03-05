import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { LeaveOrganizationDialog, DeleteOrganizationDialog, BillingProfileCard } from "@/components/organization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function OrgSettings() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { organization, teamMembers, isLoading, notFound, isAdmin } = useOrganizationDashboard(slug);
  const queryClient = useQueryClient();

  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Find current user's role
  const currentMember = teamMembers.find(m => m.user_id === user?.id);
  const userRole = currentMember?.role || "member";
  const isOwner = userRole === "owner";

  const currentContactEmail = contactEmail ?? organization?.contact_email ?? "";

  const handleSaveContactEmail = async () => {
    if (!organization?.id || !isAdmin) return;
    setIsSavingEmail(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ contact_email: currentContactEmail || null })
        .eq("id", organization.id);
      if (error) throw error;
      toast.success("Contact email updated");
      queryClient.invalidateQueries({ queryKey: ["organization", slug] });
    } catch (err) {
      console.error("Failed to update contact email:", err);
      toast.error("Failed to update contact email");
    } finally {
      setIsSavingEmail(false);
    }
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
                {isAdmin && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="contact-email">Contact Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="contact@yourorg.com"
                        value={currentContactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveContactEmail}
                        disabled={isSavingEmail || currentContactEmail === (organization?.contact_email ?? "")}
                      >
                        {isSavingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Visible to service providers. Falls back to owner's email if not set.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Billing Information - Only visible to admins */}
        {isAdmin && <BillingProfileCard organizationId={organization?.id} />}

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
