import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Clock, Search, Filter, Plus } from "lucide-react";
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
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { LogWorkDialog } from "@/components/provider";

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  development: "default",
  consulting: "secondary",
  training: "outline",
  support: "secondary",
  other: "outline",
};

export default function ProviderWorkLogs() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, workLogs, customers, isLoading, notFound, refetchWorkLogs, refetchCustomers } = useProviderDashboard(slug);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const handleWorkLogSuccess = () => {
    refetchWorkLogs();
    refetchCustomers(); // Refetch to update credit balances
  };

  const filteredLogs = useMemo(() => {
    return workLogs.filter((log) => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.organization_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
      const matchesCustomer = customerFilter === "all" || log.organization_id === customerFilter;
      return matchesSearch && matchesCategory && matchesCustomer;
    });
  }, [workLogs, searchQuery, categoryFilter, customerFilter]);

  // Calculate totals
  const totalMinutes = filteredLogs.reduce((acc, l) => acc + l.minutes_spent, 0);
  const billableMinutes = filteredLogs.filter(l => l.is_billable).reduce((acc, l) => acc + l.minutes_spent, 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Logs</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage logged hours for {provider?.name}
          </p>
        </div>
        {provider && (
          <LogWorkDialog
            providerId={provider.id}
            providerName={provider.name}
            customers={customers}
            onSuccess={handleWorkLogSuccess}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Hours
              </Button>
            }
          />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Logged
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold">{minutesToHours(totalMinutes)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Billable Hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold text-primary">{minutesToHours(billableMinutes)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Showing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-16" />
            ) : (
              <p className="text-3xl font-bold">{filteredLogs.length}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Work Logs</CardTitle>
          <CardDescription>
            {workLogs.length} total log{workLogs.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by description or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.organization_id} value={c.organization_id}>
                    {c.organization_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {workLogs.length === 0 ? (
                <>
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No work logs yet</p>
                  <p className="text-sm mt-1">Click "Log Hours" to record your first entry.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No matching logs</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Performer</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.performed_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.organization_name}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-2 text-sm">{log.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={categoryColors[log.category] || "outline"} className="capitalize">
                        {log.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.performer_name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {minutesToHours(log.minutes_spent)}h
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
