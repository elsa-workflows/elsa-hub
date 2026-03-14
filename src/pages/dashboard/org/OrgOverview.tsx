import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Copy, Check, Calendar, Clock, ExternalLink, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { CreditBalanceCard, PurchaseHistoryTable, TeamMembersCard, SubscriptionCard } from "@/components/organization";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useTidyCalBookingTypes } from "@/hooks/useTidyCalBookingTypes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OrgOverview() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(false);
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

  // Auto-redirect to dashboard when org not found after a short delay
  useEffect(() => {
    if (notFound && !isLoading) {
      const timeout = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [notFound, isLoading, navigate]);

  const handleCopyId = async () => {
    if (!organization?.id) return;
    try {
      await navigator.clipboard.writeText(organization.id);
      setCopiedId(true);
      toast.success("Organization ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Failed to copy ID");
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
        <p className="text-sm text-muted-foreground mb-4">Redirecting to dashboard...</p>
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
              {organization?.id && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border">
                  <span className="text-xs text-muted-foreground font-medium">Org ID:</span>
                  <button
                    onClick={handleCopyId}
                    className="text-sm font-mono text-foreground flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                    title="Click to copy Organization ID"
                  >
                    {organization.id}
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
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

      {/* Book a Call */}
      <BookACallCard orgId={organization?.id} slug={slug} />

      {/* Active Subscriptions */}
      <SubscriptionCard 
        subscriptions={subscriptions || []} 
        loading={subscriptionsLoading}
        isAdmin={isAdmin}
        organizationId={organization?.id}
      />

      {/* Recent Purchases - Preview */}
      <PurchaseHistoryTable 
        orders={orders?.slice(0, 5) || []} 
        subscriptions={subscriptions || []} 
        loading={isLoading || subscriptionsLoading} 
      />
      
      {((orders && orders.length > 5) || (subscriptions && subscriptions.length > 0)) && (
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

function useOrgProviders(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org-providers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_customers")
        .select("service_provider_id")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data?.map((d) => d.service_provider_id) || [];
    },
    enabled: !!orgId,
  });
}

function BookACallCard({ orgId, slug }: { orgId: string | undefined; slug: string | undefined }) {
  const { data: providerIds } = useOrgProviders(orgId);
  const firstProviderId = providerIds?.[0];
  const { data: bookingTypes, isLoading } = useTidyCalBookingTypes(firstProviderId);

  // Don't render if no provider or no booking types
  if (!firstProviderId) return null;
  if (!isLoading && (!bookingTypes || bookingTypes.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Book a Call
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/dashboard/org/${slug}/bookings`}>
              View All
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 flex-1" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bookingTypes?.slice(0, 3).map((bt) => (
              <a
                key={bt.id}
                href={bt.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bt.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {bt.duration}m
                    </span>
                    {bt.price > 0 ? (
                      <span>${(bt.price / 100).toFixed(0)}</span>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">Free</Badge>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
