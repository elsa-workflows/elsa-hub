import { format, differenceInDays } from "date-fns";
import { Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CreditLot {
  id: string;
  minutes_purchased: number;
  minutes_remaining: number;
  status: string;
  purchased_at: string;
  expires_at: string;
  provider_name: string;
}

interface CreditLotsTableProps {
  lots: CreditLot[];
  loading?: boolean;
}

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

const statusConfig: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  exhausted: { icon: <XCircle className="h-3 w-3" />, variant: "secondary" },
  expired: { icon: <AlertTriangle className="h-3 w-3" />, variant: "destructive" },
};

export function CreditLotsTable({ lots, loading }: CreditLotsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Credit Lots
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
          <Clock className="h-5 w-5 text-primary" />
          Credit Lots
        </CardTitle>
        <CardDescription>Individual credit purchases and their expiration dates</CardDescription>
      </CardHeader>
      <CardContent>
        {lots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No credit lots yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => {
                const usedMinutes = lot.minutes_purchased - lot.minutes_remaining;
                const usagePercent = lot.minutes_purchased > 0 
                  ? (usedMinutes / lot.minutes_purchased) * 100 
                  : 0;
                const daysUntilExpiry = differenceInDays(new Date(lot.expires_at), new Date());
                const isExpiringSoon = lot.status === "active" && daysUntilExpiry <= 30;
                const status = statusConfig[lot.status] || statusConfig.active;

                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-medium">{lot.provider_name}</TableCell>
                    <TableCell>
                      <div>
                        <p>{format(new Date(lot.purchased_at), "MMM d, yyyy")}</p>
                        <p className="text-sm text-muted-foreground">
                          {minutesToHours(lot.minutes_purchased)}h
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={isExpiringSoon ? "text-destructive" : ""}>
                        <p>{format(new Date(lot.expires_at), "MMM d, yyyy")}</p>
                        {lot.status === "active" && (
                          <p className="text-sm text-muted-foreground">
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : "Expired"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{minutesToHours(usedMinutes)}h used</span>
                          <span className="text-muted-foreground">
                            {minutesToHours(lot.minutes_remaining)}h left
                          </span>
                        </div>
                        <Progress value={usagePercent} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        {status.icon}
                        {lot.status.charAt(0).toUpperCase() + lot.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
