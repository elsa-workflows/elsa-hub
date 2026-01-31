import { Users, Building2, Receipt, DollarSign, CreditCard, Mail } from "lucide-react";
import { AdminStatsCard } from "@/components/admin";
import { useAdminOverviewStats } from "@/hooks/useAdminData";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverview() {
  const { data: stats, isLoading } = useAdminOverviewStats();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground">Key metrics and platform health</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground">Key metrics and platform health</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AdminStatsCard
          title="Total Users"
          value={stats?.total_users ?? 0}
          description="Registered accounts"
          icon={Users}
        />
        <AdminStatsCard
          title="Organizations"
          value={stats?.total_organizations ?? 0}
          description="Active organizations"
          icon={Building2}
        />
        <AdminStatsCard
          title="Paid Orders"
          value={stats?.total_orders ?? 0}
          description="Completed purchases"
          icon={Receipt}
        />
        <AdminStatsCard
          title="Total Revenue"
          value={formatCurrency(Number(stats?.total_revenue_cents ?? 0))}
          description="Lifetime revenue"
          icon={DollarSign}
        />
        <AdminStatsCard
          title="Active Subscriptions"
          value={stats?.active_subscriptions ?? 0}
          description="Recurring customers"
          icon={CreditCard}
        />
        <AdminStatsCard
          title="Pending Invitations"
          value={stats?.pending_invitations ?? 0}
          description="Awaiting acceptance"
          icon={Mail}
        />
      </div>
    </div>
  );
}
