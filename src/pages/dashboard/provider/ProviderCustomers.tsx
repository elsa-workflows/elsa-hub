import { useParams, Link } from "react-router-dom";
import { Building2, Users, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

export default function ProviderCustomers() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, customers, isLoading, notFound } = useProviderDashboard(slug);

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

  // Calculate totals
  const totalAvailable = customers.reduce((acc, c) => acc + c.available_minutes, 0);
  const totalPurchased = customers.reduce((acc, c) => acc + c.total_minutes, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Organizations</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer relationships for {provider?.name}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-16" />
            ) : (
              <p className="text-3xl font-bold">{customers.length}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Available Credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold text-primary">{minutesToHours(totalAvailable)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Purchased
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold">{minutesToHours(totalPurchased)}h</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            Organizations that have purchased credits from your services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No customers yet</p>
              <p className="text-sm mt-1">Customers will appear when they purchase credits.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Customer Since</TableHead>
                  <TableHead>Credit Usage</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const usedMinutes = customer.total_minutes - customer.available_minutes;
                  const usagePercent = customer.total_minutes > 0 
                    ? (usedMinutes / customer.total_minutes) * 100 
                    : 0;

                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.organization_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              /{customer.organization_slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(customer.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{minutesToHours(usedMinutes)}h used</span>
                            <span className="text-muted-foreground">
                              of {minutesToHours(customer.total_minutes)}h
                            </span>
                          </div>
                          <Progress value={usagePercent} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-xl font-bold text-primary">
                          {minutesToHours(customer.available_minutes)}h
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
