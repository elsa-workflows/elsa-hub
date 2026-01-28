import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Search, Receipt, UserCircle, Store, ExternalLink } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProviderOrders } from "@/hooks/useProviderOrders";

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

export default function ProviderOrders() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, orders, isLoading, notFound } = useProviderOrders(slug);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.bundle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "provider" && order.is_provider_created) ||
        (sourceFilter === "customer" && !order.is_provider_created);
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  // Summary stats
  const totalRevenue = filteredOrders
    .filter((o) => o.status === "paid")
    .reduce((acc, o) => acc + o.amount_cents, 0);
  const providerCreatedCount = filteredOrders.filter((o) => o.is_provider_created).length;
  const customerCreatedCount = filteredOrders.filter((o) => !o.is_provider_created).length;

  if (notFound && !isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Provider Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This service provider doesn't exist or you don't have access to it.
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
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">
          View all orders for {provider?.name}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-24" />
            ) : (
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(totalRevenue, "usd")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Customer Orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-16" />
            ) : (
              <p className="text-3xl font-bold">{customerCreatedCount}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Provider Orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-16" />
            ) : (
              <p className="text-3xl font-bold">{providerCreatedCount}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            {orders.length} total order{orders.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer, bundle, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="customer">Customer orders</SelectItem>
                <SelectItem value="provider">Provider orders</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {orders.length === 0 ? (
                <>
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No orders yet</p>
                  <p className="text-sm mt-1">Orders will appear here when customers purchase bundles.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No matching orders</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Bundle</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              {order.is_provider_created ? (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                                  <Store className="h-3.5 w-3.5 text-secondary-foreground" />
                                </div>
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                  <UserCircle className="h-3.5 w-3.5 text-primary" />
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {order.is_provider_created ? (
                              <p>Created by you (provider)</p>
                            ) : (
                              <p>Placed by customer{order.created_by_name ? `: ${order.created_by_name}` : ""}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.organization_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{order.bundle_name}</div>
                        <div className="text-xs text-muted-foreground">{order.bundle_hours}h</div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[order.status] || "outline"} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.amount_cents, order.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.receipt_url ? (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={order.receipt_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
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
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
