import { useMemo } from "react";
import { Receipt, ExternalLink, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderWithBundle } from "@/hooks/useOrganizationDashboard";

interface SubscriptionData {
  id: string;
  created_at: string;
  status: string;
  bundle_name: string;
  monthly_hours: number;
}

interface PurchaseHistoryTableProps {
  orders: OrderWithBundle[];
  subscriptions?: SubscriptionData[];
  loading?: boolean;
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
}

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

export function PurchaseHistoryTable({ orders, subscriptions = [], loading }: PurchaseHistoryTableProps) {
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

    const subscriptionPurchases: UnifiedPurchase[] = subscriptions.map((sub) => ({
      id: sub.id,
      created_at: sub.created_at,
      status: sub.status,
      amount_cents: 0,
      currency: "eur",
      bundle_name: sub.bundle_name,
      bundle_hours: sub.monthly_hours,
      receipt_url: null,
      type: "subscription" as const,
    }));

    return [...oneTimePurchases, ...subscriptionPurchases].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orders, subscriptions]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Purchase History
        </CardTitle>
        <CardDescription>Orders and invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {allPurchases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No purchases yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bundle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    {format(new Date(purchase.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {purchase.type === "subscription" && (
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{purchase.bundle_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.bundle_hours}h{purchase.type === "subscription" ? "/mo" : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {purchase.type === "subscription" ? (
                      <span className="text-muted-foreground text-sm">Recurring</span>
                    ) : (
                      formatCurrency(purchase.amount_cents, purchase.currency)
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[purchase.status] || "secondary"}>
                      {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {purchase.receipt_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={purchase.receipt_url} target="_blank" rel="noopener noreferrer">
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
        )}
      </CardContent>
    </Card>
  );
}
