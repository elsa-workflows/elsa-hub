import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { User, LogOut, Mail, Calendar, Building2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useOrganizations } from "@/hooks/useOrganizations";
import { CreateOrganizationDialog } from "@/components/account/CreateOrganizationDialog";
import { OrganizationList } from "@/components/account/OrganizationList";

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organizations, loading: orgsLoading, createOrganization } = useOrganizations();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <Layout>
      <div className="min-h-[calc(100vh-10rem)] py-12 px-4">
        <div className="container max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Your Account</CardTitle>
              <CardDescription>
                Manage your Elsa Workflows account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member since</p>
                    <p className="font-medium">{createdAt}</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>

          {/* Organizations Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Organizations</CardTitle>
                </div>
                <CreateOrganizationDialog onCreateOrganization={createOrganization} />
              </div>
              <CardDescription>
                Organizations you belong to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationList organizations={organizations} loading={orgsLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
