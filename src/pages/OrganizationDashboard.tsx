import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { CreditBalanceCard, PurchaseHistoryTable, TeamMembersCard } from "@/components/organization";

export default function OrganizationDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { organization, creditBalances, orders, teamMembers, isLoading, notFound } = useOrganizationDashboard(slug);

  if (notFound && !isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-4">
          <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This organization doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/account">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Account
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-10rem)] py-8 px-4">
        <div className="container max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/account">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              {isLoading ? (
                <div className="h-8 w-48 bg-muted/50 animate-pulse rounded" />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {organization?.logo_url ? (
                      <img 
                        src={organization.logo_url} 
                        alt={organization.name} 
                        className="h-6 w-6 rounded" 
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{organization?.name}</h1>
                    <p className="text-sm text-muted-foreground">/{organization?.slug}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <CreditBalanceCard balances={creditBalances} loading={isLoading} />
            <TeamMembersCard members={teamMembers} loading={isLoading} />
          </div>

          {/* Purchase History - Full Width */}
          <PurchaseHistoryTable orders={orders} loading={isLoading} />
        </div>
      </div>
    </Layout>
  );
}
