import { useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Clock, Mail, User, Video, MapPin, MessageSquare, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTidyCalBookings, TidyCalBooking } from "@/hooks/useTidyCalBookings";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";

function BookingCard({ booking }: { booking: TidyCalBooking }) {
  const startDate = new Date(booking.starts_at);
  const locationLabel = booking.meeting_url
    ? booking.meeting_url.includes("teams.microsoft")
      ? "Microsoft Teams web conference"
      : booking.meeting_url.includes("zoom.us")
        ? "Zoom meeting"
        : booking.meeting_url.includes("meet.google")
          ? "Google Meet"
          : "Online meeting"
    : null;

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Left: Date & Time */}
          <div className="shrink-0 md:w-40">
            <p className="font-semibold text-sm">
              {format(startDate, "MMMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(startDate, "HH:mm")}
              {booking.booking_type_duration && (
                <> · {booking.booking_type_duration} minutes</>
              )}
            </p>
          </div>

          {/* Middle: Details */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-12 shrink-0">What:</span>
              <span className="font-medium text-primary truncate">
                {booking.booking_type_title || "Booking"}
              </span>
            </div>

            {(booking.contact_name || booking.contact_email) && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-12 shrink-0">With:</span>
                <span className="text-primary truncate">
                  {booking.contact_name || booking.contact_email}
                </span>
              </div>
            )}

            {locationLabel && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-12 shrink-0">Where:</span>
                <span className="text-muted-foreground">{locationLabel}</span>
              </div>
            )}

            {booking.questions && booking.questions.length > 0 && (
              <div className="mt-2 space-y-1">
                {booking.questions.map((q) => (
                  <div key={q.id} className="flex items-start gap-2 text-xs">
                    <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span>
                      <span className="text-muted-foreground">{q.question}:</span>{" "}
                      <span className="font-medium">{q.answer}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Status & Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {booking.cancelled ? (
              <Badge variant="destructive" className="text-xs">
                Cancelled
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400">
                Confirmed
              </Badge>
            )}

            {booking.meeting_url && !booking.cancelled && (
              <Button variant="outline" size="sm" asChild>
                <a href={booking.meeting_url} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                  <Video className="h-3 w-3" />
                  Join
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Contact email shown subtly below if we have both name and email */}
        {booking.contact_name && booking.contact_email && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground md:ml-40 md:pl-4">
            <Mail className="h-3 w-3" />
            {booking.contact_email}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
          <Skeleton key={i} className="h-24" />
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
        <BookingCard key={booking.id} booking={booking} />
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
