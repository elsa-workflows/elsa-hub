import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TidyCalBookingType {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  price: number;
  currency: string;
  url: string;
  is_active: boolean;
}

export function useTidyCalBookingTypes(providerId: string | undefined) {
  return useQuery({
    queryKey: ["tidycal-booking-types", providerId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tidycal-proxy", {
        body: {
          action: "list-booking-types",
          provider_id: providerId,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.code === "NOT_CONFIGURED") return [];
        throw new Error(data.error);
      }

      return (data.booking_types || []) as TidyCalBookingType[];
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
  });
}
