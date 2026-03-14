import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, CalendarDays, Clock, Copy, Check, Users, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { useTidyCalBookings } from "@/hooks/useTidyCalBookings";
import { format } from "date-fns";
import { toast } from "sonner";

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

export default function ProviderOverview() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, customers, workLogs, bundles, isLoading, notFound } = useProviderDashboard(slug);
  const { data: bookingsData, isLoading: bookingsLoading } = useTidyCalBookings(provider?.id, "upcoming");
  const [copiedId, setCopiedId] = useState(false);
  
  const upcomingBookings = bookingsData?.bookings?.slice(0, 3) || [];

  const handleCopyId = async () => {
    if (!provider?.id) return;
    try {
      await navigator.clipboard.writeText(provider.id);
      setCopiedId(true);
      toast.success("Provider ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Failed to copy ID");
    }
  };

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

  // Calculate stats
  const totalCustomerMinutes = customers.reduce((acc, c) => acc + c.available_minutes, 0);
  const recentLogs = workLogs.slice(0, 5);
  const activeBundles = bundles.filter(b => b.is_active).length;
  const last30DaysMinutes = workLogs
    .filter(l => new Date(l.performed_at) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((acc, l) => acc + l.minutes_spent, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{provider?.name}</h1>
        <p className="text-sm text-muted-foreground">/{provider?.slug}</p>
        {provider?.id && (
          <button
            onClick={handleCopyId}
            className="text-xs text-muted-foreground/60 font-mono flex items-center gap-1 hover:text-primary transition-colors cursor-pointer mt-0.5"
            title="Click to copy Provider ID"
          >
            {provider.id}
            {copiedId ? (
              <Check className="h-3 w-3 text-primary" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Customers
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
              Customer Credits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-20" />
            ) : (
              <p className="text-3xl font-bold text-primary">{minutesToHours(totalCustomerMinutes)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Hours (30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-16" />
            ) : (
              <p className="text-3xl font-bold">{minutesToHours(last30DaysMinutes)}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Bundles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-12" />
            ) : (
              <p className="text-3xl font-bold">{activeBundles}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>Next 3 scheduled calls</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/provider/${slug}/bookings`}>View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No upcoming bookings.</p>
              <p className="text-sm mt-1">Scheduled calls will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{booking.booking_type_title || "Booking"}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.contact_name || booking.contact_email || "No contact info"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{format(new Date(booking.starts_at), "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(booking.starts_at), "h:mm a")} • {booking.booking_type_duration} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Work Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Work Logs</CardTitle>
            <CardDescription>Latest logged hours</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/provider/${slug}/work-logs`}>View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No work logs yet.</p>
              <p className="text-sm mt-1">Start logging hours to see them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{log.organization_name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {log.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{minutesToHours(log.minutes_spent)}h</p>
                    <p className="text-xs text-muted-foreground capitalize">{log.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Organizations with active credit balances</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/dashboard/provider/${slug}/customers`}>View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No customers yet.</p>
              <p className="text-sm mt-1">Customers will appear when they purchase credits.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.slice(0, 5).map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{customer.organization_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {minutesToHours(customer.total_minutes)}h total purchased
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{minutesToHours(customer.available_minutes)}h</p>
                    <p className="text-xs text-muted-foreground">available</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
