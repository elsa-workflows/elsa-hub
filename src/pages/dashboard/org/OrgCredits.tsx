import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Clock, TrendingDown, AlertTriangle, Coins, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { CreditLotsTable, WorkLogsTable, UsageSummaryCard } from "@/components/organization";
import { UsagePacingCard } from "@/components/organization/UsagePacingCard";
import { supabase } from "@/integrations/supabase/client";

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

export default function OrgCredits() {
  const { slug } = useParams<{ slug: string }>();
  const { organization, creditBalances, isLoading, notFound, isAdmin } = useOrganizationDashboard(slug);

  // Fetch detailed credit lots
  const lotsQuery = useQuery({
    queryKey: ["credit-lots", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data: lots, error } = await supabase
        .from("credit_lots")
        .select("id, minutes_purchased, minutes_remaining, status, purchased_at, expires_at, service_provider_id")
        .eq("organization_id", organization.id)
        .order("expires_at", { ascending: true });
      
      if (error) throw error;
      if (!lots || lots.length === 0) return [];

      // Fetch provider names
      const providerIds = [...new Set(lots.map(l => l.service_provider_id))];
      const { data: providers } = await supabase
        .from("service_providers")
        .select("id, name")
        .in("id", providerIds);
      
      const providerMap = new Map(providers?.map(p => [p.id, p.name]) || []);

      return lots.map(lot => ({
        ...lot,
        provider_name: providerMap.get(lot.service_provider_id) || "Unknown Provider",
      }));
    },
    enabled: !!organization?.id,
  });

  // Fetch work logs for this organization
  const workLogsQuery = useQuery({
    queryKey: ["org-work-logs", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data: logs, error } = await supabase
        .from("work_logs")
        .select("id, service_provider_id, performed_by, performed_at, category, description, minutes_spent")
        .eq("organization_id", organization.id)
        .order("performed_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Fetch provider names
      const providerIds = [...new Set(logs.map((l) => l.service_provider_id))];
      const { data: providers } = await supabase
        .from("service_providers")
        .select("id, name")
        .in("id", providerIds);
      const providerMap = new Map(providers?.map((p) => [p.id, p.name]) || []);

      // Fetch performer names
      const performerIds = [...new Set(logs.map((l) => l.performed_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", performerIds);
      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p.display_name || p.email]) || []
      );

      return logs.map((log) => ({
        id: log.id,
        performed_at: log.performed_at,
        category: log.category,
        description: log.description,
        minutes_spent: log.minutes_spent,
        performer_name: profileMap.get(log.performed_by) || null,
        provider_name: providerMap.get(log.service_provider_id) || "Unknown",
      }));
    },
    enabled: !!organization?.id,
  });

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

  // Aggregate totals across all providers
  const totals = creditBalances.reduce(
    (acc, b) => ({
      total: acc.total + b.total_minutes,
      used: acc.used + b.used_minutes,
      available: acc.available + b.available_minutes,
      expiring: acc.expiring + b.expiring_soon_minutes,
    }),
    { total: 0, used: 0, available: 0, expiring: 0 }
  );

  const usagePercent = totals.total > 0 ? (totals.used / totals.total) * 100 : 0;

  // Get active lots for summary
  const activeLots = lotsQuery.data?.filter(l => l.status === "active") || [];
  const exhaustedLots = lotsQuery.data?.filter(l => l.status === "exhausted") || [];
  const expiredLots = lotsQuery.data?.filter(l => l.status === "expired") || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credits & Usage</h1>
          <p className="text-muted-foreground mt-1">
            Track your credit balance and usage for {organization?.name}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/enterprise/expert-services">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase Credits
            </Link>
          </Button>
        )}
      </div>

      {/* Usage Summary Card */}
      <UsageSummaryCard
        organizationId={organization?.id}
        availableMinutes={totals.available}
        serviceProviderId={creditBalances.length === 1 ? creditBalances[0].service_provider_id : undefined}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Available
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold text-primary">{minutesToHours(totals.available)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Used
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold">{minutesToHours(totals.used)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Purchased
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold">{minutesToHours(totals.total)}h</p>
            )}
          </CardContent>
        </Card>

        <Card className={totals.expiring > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${totals.expiring > 0 ? "text-destructive" : ""}`} />
              Expiring Soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className={`text-3xl font-bold ${totals.expiring > 0 ? "text-destructive" : ""}`}>
                {minutesToHours(totals.expiring)}h
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      {totals.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Usage</CardTitle>
            <CardDescription>
              {minutesToHours(totals.used)}h used of {minutesToHours(totals.total)}h total purchased
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={usagePercent} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{usagePercent.toFixed(1)}% consumed</span>
              <span>{(100 - usagePercent).toFixed(1)}% remaining</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Usage Pacing Transparency */}
      {organization?.id && (
        <UsagePacingCard 
          organizationId={organization.id}
          serviceProviderId={creditBalances.length === 1 ? creditBalances[0].service_provider_id : undefined}
        />
      )}

      {/* Per-Provider Breakdown */}
      {creditBalances.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Balance by Provider</CardTitle>
            <CardDescription>Credit balance breakdown by service provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creditBalances.map((balance) => (
                <div key={balance.service_provider_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{balance.provider_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {minutesToHours(balance.used_minutes)}h used of {minutesToHours(balance.total_minutes)}h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{minutesToHours(balance.available_minutes)}h</p>
                    <p className="text-sm text-muted-foreground">available</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lot Status Summary */}
      {lotsQuery.data && lotsQuery.data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{activeLots.length}</p>
                <p className="text-sm text-muted-foreground">Active Lots</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{exhaustedLots.length}</p>
                <p className="text-sm text-muted-foreground">Fully Used</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{expiredLots.length}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Credit Lots Table */}
      <CreditLotsTable lots={lotsQuery.data || []} loading={lotsQuery.isLoading} />

      {/* Work Logs Table */}
      <WorkLogsTable
        logs={workLogsQuery.data || []}
        loading={workLogsQuery.isLoading}
        showProvider={creditBalances.length > 1}
        emptyMessage="No work logged yet"
        emptySubMessage="Work performed by your service provider will appear here."
      />
    </div>
  );
}
