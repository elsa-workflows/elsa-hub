import { useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Clock, Mail, User } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTidyCalBookings, TidyCalBooking } from "@/hooks/useTidyCalBookings";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";

function ProviderBookingsList({
  providerId,
  mode,
}: {
  providerId: string | undefined;
  mode: "upcoming" | "past";
}) {
  const { data, isLoading } = useTidyCalBookings(providerId, mode);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const bookings = data?.bookings || [];

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No {mode} bookings found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking: TidyCalBooking) => (
        <Card key={booking.id}>
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">
                  {booking.booking_type_title || "Booking"}
                </p>
                {booking.cancelled && (
                  <Badge variant="destructive" className="text-xs">
                    Cancelled
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(booking.starts_at), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(booking.starts_at), "h:mm a")}
                </span>
                {booking.booking_type_duration && (
                  <span>{booking.booking_type_duration} min</span>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0">
              {booking.contact_name && (
                <p className="flex items-center gap-1 justify-end">
                  <User className="h-3 w-3" />
                  {booking.contact_name}
                </p>
              )}
              {booking.contact_email && (
                <p className="flex items-center gap-1 justify-end">
                  <Mail className="h-3 w-3" />
                  {booking.contact_email}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ProviderBookings() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, isLoading } = useProviderDashboard(slug);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground mt-1">
          View all scheduled and past bookings
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          <ProviderBookingsList providerId={provider?.id} mode="upcoming" />
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <ProviderBookingsList providerId={provider?.id} mode="past" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
