import { useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowRight, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { CreditBalanceCard, PurchaseHistoryTable, TeamMembersCard, SubscriptionCard } from "@/components/organization";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { toast } from "sonner";

export default function OrgOverview() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    organization, 
    creditBalances, 
    orders, 
    teamMembers, 
    pendingInvitations,
    isAdmin,
    isLoading, 
    notFound,
    refetchInvitations,
  } = useOrganizationDashboard(slug);

  // Fetch subscriptions
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions(organization?.id);

  // Handle payment success from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      toast.success("Payment successful!", {
        description: "Your credits have been added to your account.",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-4">
        <QuickLinkCard title="Orders" description="View purchase history" href={`/dashboard/org/${slug}/orders`} />
        <QuickLinkCard title="Credits" description="Track usage & expiration" href={`/dashboard/org/${slug}/credits`} />
        <QuickLinkCard title="Team" description="Manage members" href={`/dashboard/org/${slug}/team`} />
        <QuickLinkCard title="Settings" description="Organization settings" href={`/dashboard/org/${slug}/settings`} />
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <CreditBalanceCard balances={creditBalances} loading={isLoading} />
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

      {/* Active Subscriptions */}
      <SubscriptionCard 
        subscriptions={subscriptions || []} 
        loading={subscriptionsLoading}
        isAdmin={isAdmin}
        organizationId={organization?.id}
      />

      {/* Recent Orders - Preview */}
      <PurchaseHistoryTable orders={orders?.slice(0, 5) || []} loading={isLoading} />
      
      {orders && orders.length > 5 && (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link to={`/dashboard/org/${slug}/orders`}>
              View All Orders
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function QuickLinkCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <Link to={href}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            {title}
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
