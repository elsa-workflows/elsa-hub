import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, Briefcase, ArrowRight, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useProviderMemberships } from "@/hooks/useProviderMemberships";
import { CreateOrganizationDialog } from "@/components/account/CreateOrganizationDialog";

export default function DashboardHome() {
  const navigate = useNavigate();
  const { organizations, loading: orgsLoading, createOrganization } = useOrganizations();
  const { providers, loading: providersLoading } = useProviderMemberships();

  const loading = orgsLoading || providersLoading;
  const hasOnlyOneOrg = organizations.length === 1 && providers.length === 0;

  // Auto-redirect if user has only one org
  useEffect(() => {
    if (!loading && hasOnlyOneOrg) {
      navigate(`/dashboard/org/${organizations[0].slug}`, { replace: true });
    }
  }, [loading, hasOnlyOneOrg, organizations, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show selector if multiple contexts
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Select an organization or provider to get started
        </p>
      </div>

      {/* Organizations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
          </h2>
          <CreateOrganizationDialog onCreateOrganization={createOrganization} />
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                You don't belong to any organizations yet
              </p>
              <CreateOrganizationDialog 
                onCreateOrganization={createOrganization}
                trigger={
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Organization
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="group hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/org/${org.slug}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="h-6 w-6 rounded" />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{org.name}</CardTitle>
                        <CardDescription className="text-xs">/{org.slug}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {org.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-end text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View Dashboard
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Service Providers Section */}
      {providers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Service Provider
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {providers.map((provider) => (
              <Card
                key={provider.id}
                className="group hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/provider/${provider.slug}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {provider.logo_url ? (
                          <img src={provider.logo_url} alt={provider.name} className="h-6 w-6 rounded" />
                        ) : (
                          <Briefcase className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <CardDescription className="text-xs">/{provider.slug}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {provider.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-end text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View Dashboard
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
