import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  RADAR_PUBLIC_STATUS,
  toPublicRadarLocations,
  type RadarLocationRow,
} from "@/lib/radarLocations";

export type { RadarLocationRow } from "@/lib/radarLocations";
export { rowToLocation } from "@/lib/radarLocations";

export const RADAR_LOCATIONS_KEY = ["radar-locations"] as const;

export function useRadarLocations() {
  return useQuery({
    queryKey: RADAR_LOCATIONS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_locations")
        .select("*")
        .eq("status", RADAR_PUBLIC_STATUS)
        .order("sort_order", { ascending: true })
        .order("country", { ascending: true })
        .limit(2000);

      if (error) {
        console.warn("Radar locations query failed; showing no public entries", error);
        return [];
      }

      return toPublicRadarLocations((data ?? []) as unknown as RadarLocationRow[]);
    },
    placeholderData: (previousData) => previousData ?? [],
    staleTime: 60_000,
  });
}

export function useRadarLocationsAdmin() {
  return useQuery({
    queryKey: [...RADAR_LOCATIONS_KEY, "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_locations")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("country", { ascending: true });
      if (error) throw error;
      return data as unknown as RadarLocationRow[];
    },
    staleTime: 10_000,
  });
}
