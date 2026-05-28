// Public submission endpoint for the community radar.
// Geocodes the city+country via OpenStreetMap Nominatim, inserts a pending
// radar_locations row using the service role, and notifies platform admins.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const REGIONS = [
  "Europe",
  "North America",
  "South America",
  "Asia",
  "Africa",
  "Oceania",
] as const;

const BodySchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  websiteUrl: z.string().trim().max(500).url().optional().or(z.literal("")),
  contactEmail: z.string().trim().email().max(255),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  region: z.enum(REGIONS),
  industry: z.string().trim().min(1).max(160),
  description: z.string().trim().min(20).max(600),
  usingSince: z.number().int().min(1990).max(2100),
  visibility: z.enum(["showcase", "anonymous"]),
});

type GeocodeResult = { lat: number; lon: number } | null;

async function geocode(city: string, country: string): Promise<GeocodeResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("city", city);
    url.searchParams.set("country", country);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a descriptive User-Agent
        "User-Agent": "elsa-workflows.io/radar-submissions (contact: hello@elsa-workflows.io)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!arr.length) return null;
    const lat = Number(arr[0].lat);
    const lon = Number(arr[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (_err) {
    return null;
  }
}

// Approximate centroids per region, used when geocoding fails.
const REGION_CENTERS: Record<(typeof REGIONS)[number], { lat: number; lon: number }> = {
  "Europe": { lat: 51.0, lon: 10.0 },
  "North America": { lat: 40.0, lon: -100.0 },
  "South America": { lat: -15.0, lon: -60.0 },
  "Asia": { lat: 34.0, lon: 100.0 },
  "Africa": { lat: 1.0, lon: 21.0 },
  "Oceania": { lat: -25.0, lon: 135.0 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const data = parsed.data;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Identify the submitter if a session token was provided.
  let submittedBy: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const userClient = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: u } = await userClient.auth.getUser();
      submittedBy = u.user?.id ?? null;
    } catch {
      // Anonymous submission is fine.
    }
  }

  // Geocode → fallback to region centroid with a small random jitter so
  // pins from the same region don't stack.
  let coords = await geocode(data.city, data.country);
  let geocoded = !!coords;
  if (!coords) {
    const c = REGION_CENTERS[data.region];
    const jitter = () => (Math.random() - 0.5) * 6; // ±3°
    coords = { lat: c.lat + jitter(), lon: c.lon + jitter() };
  }

  const anonymous = data.visibility === "anonymous";

  const insertPayload = {
    latitude: coords.lat,
    longitude: coords.lon,
    city: data.city,
    country: data.country,
    region: data.region,
    anonymous,
    weight: 0.5,
    sort_order: 100,
    company_name: anonymous ? null : data.companyName,
    website_url: anonymous ? null : (data.websiteUrl || null),
    industry: anonymous ? null : data.industry,
    description: anonymous ? null : data.description,
    using_since: anonymous ? null : data.usingSince,
    status: "pending",
    submitted_contact_email: data.contactEmail,
    submitted_by: submittedBy,
    submitted_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertErr } = await admin
    .from("radar_locations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr) {
    console.error("Insert failed", insertErr);
    return new Response(
      JSON.stringify({ error: "Failed to record submission" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Notify all platform admins (in-app notification).
  try {
    const { data: admins } = await admin.from("platform_admins").select("user_id");
    if (admins?.length) {
      const summary = anonymous
        ? `${data.city}, ${data.country} (anonymous)`
        : `${data.companyName} — ${data.city}, ${data.country}`;
      const rows = admins.map((a) => ({
        user_id: a.user_id,
        type: "radar_submission",
        title: "New radar submission",
        message: summary,
        action_url: "/dashboard/admin/radar-locations",
        payload: {
          submission_id: inserted.id,
          company_name: data.companyName,
          city: data.city,
          country: data.country,
          region: data.region,
          contact_email: data.contactEmail,
          visibility: data.visibility,
          geocoded,
        },
      }));
      const { error: notifErr } = await admin.from("notifications").insert(rows);
      if (notifErr) console.error("Notification insert failed", notifErr);
    }
  } catch (e) {
    console.error("Admin notification step failed", e);
  }

  return new Response(
    JSON.stringify({ ok: true, id: inserted.id, geocoded }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
