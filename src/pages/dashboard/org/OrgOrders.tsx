import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Search, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";
import { useSubscriptions } from "@/hooks/useSubscriptions";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  active: "default",
  pending: "secondary",
  cancelled: "destructive",
  canceled: "destructive",
  refunded: "outline",
};

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

interface UnifiedPurchase {
  id: string;
  created_at: string;
  status: string;
  amount_cents: number;
  currency: string;
  bundle_name: string;
  bundle_hours: number;
  receipt_url: string | null;
  type: "one_time" | "subscription";
  recurring_label?: string;
}

export default function OrgOrders() {
  const { slug } = useParams<{ slug: string }>();
  const { organization, orders, isLoading, notFound } = useOrganizationDashboard(slug);
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions(organization?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Combine orders and subscriptions into a unified list
  const allPurchases = useMemo((): UnifiedPurchase[] => {
    const oneTimePurchases: UnifiedPurchase[] = orders.map((order) => ({
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      amount_cents: order.amount_cents,
      currency: order.currency,
      bundle_name: order.bundle_name,
      bundle_hours: order.bundle_hours,
      receipt_url: order.receipt_url,
      type: "one_time" as const,
    }));

    const subscriptionPurchases: UnifiedPurchase[] = (subscriptions || []).map((sub) => ({
      id: sub.id,
      created_at: sub.created_at,
      status: sub.status,
      amount_cents: 0, // We don't store subscription price in the record, but we could enhance this
      currency: "eur",
      bundle_name: sub.bundle_name,
      bundle_hours: sub.monthly_hours,
      receipt_url: null,
      type: "subscription" as const,
      recurring_label: "Monthly",
    }));

    return [...oneTimePurchases, ...subscriptionPurchases].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, subscriptions]);

  const filteredPurchases = useMemo(() => {
    return allPurchases.filter((purchase) => {
      const matchesSearch = 
        purchase.bundle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
      const matchesType = typeFilter === "all" || purchase.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allPurchases, searchQuery, statusFilter, typeFilter]);

  const combinedLoading = isLoading || subscriptionsLoading;

  if (notFound && !combinedLoading) {
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
        <h1 className="text-2xl font-bold">Orders & Purchases</h1>
        <p className="text-muted-foreground mt-1">
          View your complete purchase history for {organization?.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            {allPurchases.length} total purchase{allPurchases.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bundle name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {combinedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {allPurchases.length === 0 ? (
                <>
                  <p className="text-lg font-medium">No purchases yet</p>
                  <p className="text-sm mt-1">Your purchase history will appear here</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No matching purchases</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={purchase.type === "subscription" ? "secondary" : "outline"}>
                        {purchase.type === "subscription" ? (
                          <><RefreshCw className="h-3 w-3 mr-1" /> {purchase.recurring_label}</>
                        ) : (
                          "One-time"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{purchase.bundle_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.bundle_hours}h{purchase.type === "subscription" ? "/mo" : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[purchase.status] || "secondary"}>
                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {purchase.receipt_url ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={purchase.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Receipt
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
