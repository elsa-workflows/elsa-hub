import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TidyCalBooking {
  id: number;
  starts_at: string;
  ends_at: string;
  cancelled: boolean;
  cancelled_at: string | null;
  cancel_reason: string | null;
  contact_name: string | null;
  contact_email: string | null;
  booking_type_title: string | null;
  booking_type_duration: number | null;
  meeting_url: string | null;
  timezone: string | null;
  questions: { id: number; question: string; answer: string }[];
  answers: any[] | null;
}

export function useTidyCalBookings(
  providerId: string | undefined,
  mode: "upcoming" | "past",
  orgId?: string,
  page = 1
) {
  return useQuery({
    queryKey: ["tidycal-bookings", providerId, mode, orgId, page],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tidycal-proxy", {
        body: {
          action: "list-bookings",
          provider_id: providerId,
          org_id: orgId,
          mode,
          page,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.code === "NOT_CONFIGURED") return { bookings: [], pagination: null };
        throw new Error(data.error);
      }

      return {
        bookings: (data.bookings || []) as TidyCalBooking[],
        pagination: data.pagination,
      };
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000,
  });
}
