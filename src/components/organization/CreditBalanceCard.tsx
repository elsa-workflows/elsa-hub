import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CreditBalance } from "@/hooks/useOrganizationDashboard";

interface CreditBalanceCardProps {
  balances: CreditBalance[];
  loading?: boolean;
}

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

export function CreditBalanceCard({ balances, loading }: CreditBalanceCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Credit Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-muted/50 animate-pulse rounded" />
            <div className="h-4 bg-muted/50 animate-pulse rounded w-3/4" />
            <div className="h-2 bg-muted/50 animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Credit Balance
          </CardTitle>
          <CardDescription>Expert services hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No credit balance yet.</p>
            <p className="text-sm mt-1">Purchase hours to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aggregate totals across all providers
  const totals = balances.reduce(
    (acc, b) => ({
      total: acc.total + b.total_minutes,
      used: acc.used + b.used_minutes,
      available: acc.available + b.available_minutes,
      expiring: acc.expiring + b.expiring_soon_minutes,
    }),
    { total: 0, used: 0, available: 0, expiring: 0 }
  );

  const usagePercent = totals.total > 0 ? (totals.used / totals.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Credit Balance
        </CardTitle>
        <CardDescription>Expert services hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main balance display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-primary">
            {minutesToHours(totals.available)}h
          </div>
          <p className="text-sm text-muted-foreground">Available hours</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span>{minutesToHours(totals.used)}h / {minutesToHours(totals.total)}h</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
        </div>

        {/* Expiring warning */}
        {totals.expiring > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">
              {minutesToHours(totals.expiring)}h expiring within 30 days
            </span>
          </div>
        )}

        {/* Per-provider breakdown (if multiple) */}
        {balances.length > 1 && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">By Provider</p>
            {balances.map((balance) => (
              <div key={balance.service_provider_id} className="flex justify-between text-sm">
                <span>{balance.provider_name}</span>
                <span className="font-medium">{minutesToHours(balance.available_minutes)}h</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
