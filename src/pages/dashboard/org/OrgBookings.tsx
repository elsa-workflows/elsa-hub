import { useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Clock, ExternalLink, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTidyCalBookingTypes } from "@/hooks/useTidyCalBookingTypes";
import { useTidyCalBookings, TidyCalBooking } from "@/hooks/useTidyCalBookings";
import { useOrganizationDashboard } from "@/hooks/useOrganizationDashboard";

function BookingTypeCards({ providerId, bookingUrl }: { providerId: string | undefined; bookingUrl?: string | null }) {
  const { data: bookingTypes, isLoading } = useTidyCalBookingTypes(providerId);

  if (bookingUrl) {
    return (
      <Card>
        <CardContent className="py-6">
          <Button asChild className="w-full sm:w-auto">
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              Book Now
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!bookingTypes || bookingTypes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No booking types available at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bookingTypes.map((bt) => (
        <Card key={bt.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{bt.title}</CardTitle>
            {bt.description && (
              <CardDescription className="text-sm line-clamp-2">
                {bt.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {bt.duration} min
              </span>
              {bt.price > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {(bt.price / 100).toFixed(2)} {bt.currency?.toUpperCase()}
                </span>
              )}
              {bt.price === 0 && (
                <Badge variant="secondary" className="text-xs">Free</Badge>
              )}
            </div>
            <Button asChild className="w-full">
              <a href={bt.url} target="_blank" rel="noopener noreferrer">
                Book Now
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BookingsList({
  providerId,
  orgId,
  mode,
}: {
  providerId: string | undefined;
  orgId: string | undefined;
  mode: "upcoming" | "past";
}) {
  const { data, isLoading } = useTidyCalBookings(providerId, mode, orgId);

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
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OrgBookings() {
  const { slug } = useParams<{ slug: string }>();
  const { organization, isLoading: orgLoading } = useOrganizationDashboard(slug);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  // Find provider ID from provider_customers relationship
  // For now, we fetch booking types without a specific provider filter
  // The org's providers come from provider_customers
  const providerId = organization?.id
    ? undefined // Will be resolved from customer relationships
    : undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground mt-1">
          Schedule calls and view booking history
        </p>
      </div>

      {/* Booking Types */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Booking Types</h2>
        <OrgBookingTypesWithProvider orgId={organization?.id} />
      </div>

      {/* Booking History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Bookings</h2>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            <OrgBookingsListWithProvider orgId={organization?.id} mode="upcoming" />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <OrgBookingsListWithProvider orgId={organization?.id} mode="past" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// These components resolve the provider from provider_customers
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useOrgProviders(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org-providers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_customers")
        .select("service_provider_id, service_providers(slug, booking_url)")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data?.map((d) => {
        const provider = Array.isArray((d as any).service_providers)
          ? (d as any).service_providers[0]
          : (d as any).service_providers;

        return {
          id: d.service_provider_id,
          slug: provider?.slug as string | undefined,
          bookingUrl: provider?.booking_url as string | null | undefined,
        };
      }) || [];
    },
    enabled: !!orgId,
  });
}

function OrgBookingTypesWithProvider({ orgId }: { orgId: string | undefined }) {
  const { data: providers } = useOrgProviders(orgId);
  const firstProvider = providers?.[0];

  return <BookingTypeCards providerId={firstProvider?.id} bookingUrl={firstProvider?.bookingUrl} />;
}

function OrgBookingsListWithProvider({
  orgId,
  mode,
}: {
  orgId: string | undefined;
  mode: "upcoming" | "past";
}) {
  const { data: providers } = useOrgProviders(orgId);
  const firstProviderId = providers?.[0]?.id;

  return (
    <BookingsList providerId={firstProviderId} orgId={orgId} mode={mode} />
  );
}
