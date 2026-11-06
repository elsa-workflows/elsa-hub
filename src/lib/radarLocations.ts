import {
  radarSampleLocations,
  type ElsaUsageLocation,
} from "@/data/elsaUsageLocations";

/** Public radar rows are only those an admin has approved. */
export const RADAR_PUBLIC_STATUS = "approved" as const;

export const STREET_ADDRESS_CITY_MESSAGE =
  "Use a city name, not a street address.";

export const RADAR_PUBLIC_COPY = {
  eyebrow: "community radar · approved entries",
  headline: "A community map of approved Elsa deployments.",
  lede:
    "Only reviewed, opt-in entries appear here. This is not a live feed of every install, and the counts match the approved rows on the map.",
  seoTitle: "Community Radar — approved Elsa Workflows deployments",
  seoDescription:
    "A map of approved, opt-in Elsa Workflows deployments. Entries are reviewed before they appear; this is not a live count of every install.",
  globeStatus: "approved · community radar",
  globeDataset: "reviewed entries",
  empty:
    "No approved deployments are on the map yet. Submit your team to appear after review.",
  statsSublabel: "approved entries",
} as const;

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
  status: "pending_verification" | "pending" | "approved" | "rejected" | string;
  submitted_contact_email: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

const SAMPLE_LOCATION_IDS = new Set(radarSampleLocations.map((location) => location.id));

const SAMPLE_SHOWCASE_COMPANIES = new Set(
  radarSampleLocations
    .filter((location) => !location.anonymous && location.companyName)
    .map((location) => normalizeName(location.companyName)),
);

const SAMPLE_PLACES = new Set(
  radarSampleLocations.map((location) => normalizePlace(location.city, location.country)),
);

// Compound names like Bahnhofstrasse should match; "Broadway" must not.
const STREET_HINT =
  /(weg|straße|strasse|str\.?|street|avenue|ave\.?|road|rd\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd\.?|platz|laan|gasse|close|court|ct\.?|\bway\b)/i;
const HOUSE_NUMBER = /\b\d+[a-z]?\b/i;

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizePlace(city: string | null | undefined, country: string): string {
  return `${normalizeName(city)}|${normalizeName(country)}`;
}

function hasSubmissionMetadata(row: Pick<
  RadarLocationRow,
  "submitted_at" | "submitted_by" | "submitted_contact_email"
>): boolean {
  return Boolean(row.submitted_at || row.submitted_by || row.submitted_contact_email);
}

/** City fields must be a locality, never a street or house number. */
export function looksLikeStreetAddress(city: string | null | undefined): boolean {
  if (!city) return false;
  const value = city.trim();
  if (!value) return false;
  if (/ahornweg/i.test(value)) return true;
  if (value.includes(",")) return true;
  return STREET_HINT.test(value) && HOUSE_NUMBER.test(value);
}

/**
 * Seeded demo rows from the original radar sample dataset.
 *
 * Production distinguishes them from real submissions by missing submitter
 * metadata (the seed INSERT never set submitted_at / submitted_by /
 * submitted_contact_email). Hardcoded fallback ids from
 * `radarSampleLocations` are always treated as samples.
 */
export function isSeedSampleRadarRow(
  row: Pick<
    RadarLocationRow,
    | "id"
    | "anonymous"
    | "city"
    | "country"
    | "company_name"
    | "submitted_at"
    | "submitted_by"
    | "submitted_contact_email"
  >,
): boolean {
  if (SAMPLE_LOCATION_IDS.has(row.id)) return true;
  if (hasSubmissionMetadata(row)) return false;
  if (row.company_name && SAMPLE_SHOWCASE_COMPANIES.has(normalizeName(row.company_name))) {
    return true;
  }
  // Seed showcases were sometimes later flipped to anonymous (company cleared)
  // but left without submitter metadata. Match the original city+country too.
  return SAMPLE_PLACES.has(normalizePlace(row.city, row.country));
}

export function isApprovedRealRadarRow(row: RadarLocationRow): boolean {
  if (row.status !== RADAR_PUBLIC_STATUS) return false;
  if (looksLikeStreetAddress(row.city)) return false;
  if (isSeedSampleRadarRow(row)) return false;
  return true;
}

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

/** Public page / query mapping: approved real rows only. */
export function toPublicRadarLocations(rows: RadarLocationRow[]): ElsaUsageLocation[] {
  return rows.filter(isApprovedRealRadarRow).map(rowToLocation);
}

/**
 * Extra page-level guard for already-mapped points. Drops hardcoded sample
 * ids/companies and street-address cities. Anonymous seed cities that arrived
 * as database UUIDs are filtered in `isApprovedRealRadarRow`.
 */
export function isPublicRadarLocation(location: ElsaUsageLocation): boolean {
  if (looksLikeStreetAddress(location.city)) return false;
  if (SAMPLE_LOCATION_IDS.has(location.id)) return false;
  return true;
}
