import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ElsaUsageLocation } from "@/data/elsaUsageLocations";

export type RadarLocationRow = {
  id: string;
  latitude: number | string;
  longitude: number | string;
  city: string | null;
  country: string;
  region: "Europe" | "North America" | "South America" | "Asia" | "Africa" | "Oceania";
  anonymous: boolean;
  weight: number | string;
  company_name: string | null;
  company_logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  description: string | null;
  using_since: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function rowToLocation(r: RadarLocationRow): ElsaUsageLocation {
  return {
    id: r.id,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    city: r.city ?? undefined,
    country: r.country,
    region: r.region,
    anonymous: r.anonymous,
    weight: r.weight != null ? Number(r.weight) : undefined,
    companyName: r.company_name ?? undefined,
    companyLogoUrl: r.company_logo_url ?? undefined,
    websiteUrl: r.website_url ?? undefined,
    industry: r.industry ?? undefined,
    description: r.description ?? undefined,
    usingSince: r.using_since ?? undefined,
  };
}

export const RADAR_LOCATIONS_KEY = ["radar-locations"] as const;

export function useRadarLocations() {
  return useQuery({
    queryKey: RADAR_LOCATIONS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_locations")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("country", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data as unknown as RadarLocationRow[]).map(rowToLocation);
    },
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
