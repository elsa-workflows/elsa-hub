import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Search, Download, ExternalLink } from "lucide-react";
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

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
  refunded: "outline",
};

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function OrgOrders() {
  const { slug } = useParams<{ slug: string }>();
  const { organization, orders, isLoading, notFound } = useOrganizationDashboard(slug);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.bundle_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

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
            {orders.length} total order{orders.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by bundle name or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
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
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {orders.length === 0 ? (
                <>
                  <p className="text-lg font-medium">No purchases yet</p>
                  <p className="text-sm mt-1">Your order history will appear here</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No matching orders</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.bundle_name}</p>
                        <p className="text-sm text-muted-foreground">{order.bundle_hours}h</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.amount_cents, order.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[order.status] || "secondary"}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.receipt_url ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={order.receipt_url}
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
