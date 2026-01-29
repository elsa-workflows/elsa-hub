import { Link, useParams } from "react-router-dom";
import { Building2, Clock, Users, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { useProviderUsageSummary } from "@/hooks/useProviderUsageSummary";
import { useCustomerUsageBreakdown, CustomerUsageRow } from "@/hooks/useCustomerUsageBreakdown";
import { minutesToHours } from "@/lib/dateUtils";

function TrendBadge({ row }: { row: CustomerUsageRow }) {
  if (row.trend === "new") {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <Sparkles className="h-3 w-3" />
        NEW
      </span>
    );
  }

  if (row.trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <TrendingUp className="h-3 w-3" />
        {row.trendPercent !== null ? `+${row.trendPercent}%` : "Up"}
      </span>
    );
  }

  if (row.trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <TrendingDown className="h-3 w-3" />
        {row.trendPercent !== null ? `${row.trendPercent}%` : "Down"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="h-3 w-3" />
      Same
    </span>
  );
}

export default function ProviderUsage() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, isLoading: providerLoading, notFound } = useProviderDashboard(slug);
  const { data: summary, isLoading: summaryLoading } = useProviderUsageSummary(provider?.id);
  const { data: breakdown, isLoading: breakdownLoading } = useCustomerUsageBreakdown(provider?.id);

  const isLoading = providerLoading || summaryLoading;

  if (notFound && !providerLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Provider Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This provider doesn't exist or you don't have access to it.
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
        <h1 className="text-2xl font-bold">Usage Overview</h1>
        <p className="text-muted-foreground mt-1">
          Track credit consumption across all customers
        </p>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              This Month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold">
                {minutesToHours(summary?.thisMonth.totalMinutes || 0)}h
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.thisMonth.entryCount || 0} work entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-3xl font-bold">
                {minutesToHours(summary?.lastMonth.totalMinutes || 0)}h
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {summary?.lastMonth.entryCount || 0} work entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <p className="text-3xl font-bold">
                {summary?.thisMonth.activeCustomers || 0}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">organizations this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      {summary && summary.topCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Customers This Month</CardTitle>
            <CardDescription>Highest usage by organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topCustomers.map((customer, index) => (
                <div
                  key={customer.organizationId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <span className="font-medium">{customer.organizationName}</span>
                  </div>
                  <span className="text-lg font-semibold">
                    {minutesToHours(customer.minutesThisMonth)}h
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Usage Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Usage Breakdown</CardTitle>
          <CardDescription>Detailed usage by organization with trends</CardDescription>
        </CardHeader>
        <CardContent>
          {breakdownLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : breakdown && breakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">This Month</TableHead>
                  <TableHead className="text-right">Last Month</TableHead>
                  <TableHead className="text-right">This Quarter</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((row) => (
                  <TableRow key={row.organizationId}>
                    <TableCell className="font-medium">{row.organizationName}</TableCell>
                    <TableCell className="text-right">
                      {minutesToHours(row.thisMonthMinutes)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {minutesToHours(row.lastMonthMinutes)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {minutesToHours(row.thisQuarterMinutes)}h
                    </TableCell>
                    <TableCell className="text-right">
                      <TrendBadge row={row} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No usage data yet</p>
              <p className="text-sm">Work logs will appear here once logged</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
