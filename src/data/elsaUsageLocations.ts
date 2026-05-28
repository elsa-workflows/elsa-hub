export type ElsaUsageLocation = {
  id: string;
  latitude: number;
  longitude: number;
  city?: string;
  country: string;
  region: "Europe" | "North America" | "South America" | "Asia" | "Africa" | "Oceania";
  anonymous: boolean;
  weight?: number;

  companyName?: string;
  companyLogoUrl?: string;
  websiteUrl?: string;
  industry?: string;
  description?: string;
  usingSince?: number;
};

export const elsaUsageLocations: ElsaUsageLocation[] = [
  // Public showcase
  {
    id: "valence-works",
    latitude: 52.3676,
    longitude: 4.9041,
    city: "Amsterdam",
    country: "Netherlands",
    region: "Europe",
    anonymous: false,
    weight: 1,
    companyName: "Valence Works",
    industry: "Workflow Consulting",
    description: "Building durable .NET workflow systems for regulated industries.",
    websiteUrl: "https://valence.works",
    usingSince: 2022,
  },
  {
    id: "north-claims",
    latitude: 51.5074,
    longitude: -0.1278,
    city: "London",
    country: "United Kingdom",
    region: "Europe",
    anonymous: false,
    weight: 0.9,
    companyName: "North Claims",
    industry: "Insurance",
    description: "Automating end-to-end claims orchestration across legacy systems.",
    usingSince: 2024,
  },
  {
    id: "halberd-logistics",
    latitude: 40.7128,
    longitude: -74.006,
    city: "New York",
    country: "United States",
    region: "North America",
    anonymous: false,
    weight: 0.9,
    companyName: "Halberd Logistics",
    industry: "Supply Chain",
    description: "Long-running shipment workflows with audit-grade event sourcing.",
    usingSince: 2023,
  },
  {
    id: "kiso-finance",
    latitude: 35.6762,
    longitude: 139.6503,
    city: "Tokyo",
    country: "Japan",
    region: "Asia",
    anonymous: false,
    weight: 0.8,
    companyName: "Kiso Finance",
    industry: "FinTech",
    description: "Settlement and reconciliation workflows for cross-border payments.",
    usingSince: 2024,
  },
  {
    id: "polar-research",
    latitude: 59.3293,
    longitude: 18.0686,
    city: "Stockholm",
    country: "Sweden",
    region: "Europe",
    anonymous: false,
    weight: 0.7,
    companyName: "Polar Research",
    industry: "GovTech",
    description: "Citizen-facing case workflows with full audit trail.",
    usingSince: 2023,
  },
  {
    id: "sable-health",
    latitude: 49.2827,
    longitude: -123.1207,
    city: "Vancouver",
    country: "Canada",
    region: "North America",
    anonymous: false,
    weight: 0.7,
    companyName: "Sable Health",
    industry: "Healthcare",
    description: "Patient intake and referral workflows across clinical networks.",
    usingSince: 2024,
  },

  // Anonymous markers
  ...[
    { city: "Berlin", country: "Germany", region: "Europe", latitude: 52.52, longitude: 13.405 },
    { city: "Paris", country: "France", region: "Europe", latitude: 48.8566, longitude: 2.3522 },
    { city: "Madrid", country: "Spain", region: "Europe", latitude: 40.4168, longitude: -3.7038 },
    { city: "Rome", country: "Italy", region: "Europe", latitude: 41.9028, longitude: 12.4964 },
    { city: "Warsaw", country: "Poland", region: "Europe", latitude: 52.2297, longitude: 21.0122 },
    { city: "Helsinki", country: "Finland", region: "Europe", latitude: 60.1699, longitude: 24.9384 },
    { city: "Lisbon", country: "Portugal", region: "Europe", latitude: 38.7223, longitude: -9.1393 },
    { city: "Zurich", country: "Switzerland", region: "Europe", latitude: 47.3769, longitude: 8.5417 },
    { city: "Dublin", country: "Ireland", region: "Europe", latitude: 53.3498, longitude: -6.2603 },
    { city: "Brussels", country: "Belgium", region: "Europe", latitude: 50.8503, longitude: 4.3517 },
    { city: "Vienna", country: "Austria", region: "Europe", latitude: 48.2082, longitude: 16.3738 },
    { city: "Prague", country: "Czechia", region: "Europe", latitude: 50.0755, longitude: 14.4378 },
    { city: "San Francisco", country: "United States", region: "North America", latitude: 37.7749, longitude: -122.4194 },
    { city: "Seattle", country: "United States", region: "North America", latitude: 47.6062, longitude: -122.3321 },
    { city: "Austin", country: "United States", region: "North America", latitude: 30.2672, longitude: -97.7431 },
    { city: "Chicago", country: "United States", region: "North America", latitude: 41.8781, longitude: -87.6298 },
    { city: "Boston", country: "United States", region: "North America", latitude: 42.3601, longitude: -71.0589 },
    { city: "Toronto", country: "Canada", region: "North America", latitude: 43.6532, longitude: -79.3832 },
    { city: "Montreal", country: "Canada", region: "North America", latitude: 45.5017, longitude: -73.5673 },
    { city: "Mexico City", country: "Mexico", region: "North America", latitude: 19.4326, longitude: -99.1332 },
    { city: "São Paulo", country: "Brazil", region: "South America", latitude: -23.5505, longitude: -46.6333 },
    { city: "Buenos Aires", country: "Argentina", region: "South America", latitude: -34.6037, longitude: -58.3816 },
    { city: "Bogotá", country: "Colombia", region: "South America", latitude: 4.711, longitude: -74.0721 },
    { city: "Santiago", country: "Chile", region: "South America", latitude: -33.4489, longitude: -70.6693 },
    { city: "Singapore", country: "Singapore", region: "Asia", latitude: 1.3521, longitude: 103.8198 },
    { city: "Bangalore", country: "India", region: "Asia", latitude: 12.9716, longitude: 77.5946 },
    { city: "Mumbai", country: "India", region: "Asia", latitude: 19.076, longitude: 72.8777 },
    { city: "Seoul", country: "South Korea", region: "Asia", latitude: 37.5665, longitude: 126.978 },
    { city: "Hong Kong", country: "Hong Kong", region: "Asia", latitude: 22.3193, longitude: 114.1694 },
    { city: "Shanghai", country: "China", region: "Asia", latitude: 31.2304, longitude: 121.4737 },
    { city: "Dubai", country: "United Arab Emirates", region: "Asia", latitude: 25.2048, longitude: 55.2708 },
    { city: "Tel Aviv", country: "Israel", region: "Asia", latitude: 32.0853, longitude: 34.7818 },
    { city: "Istanbul", country: "Türkiye", region: "Asia", latitude: 41.0082, longitude: 28.9784 },
    { city: "Cape Town", country: "South Africa", region: "Africa", latitude: -33.9249, longitude: 18.4241 },
    { city: "Nairobi", country: "Kenya", region: "Africa", latitude: -1.2921, longitude: 36.8219 },
    { city: "Lagos", country: "Nigeria", region: "Africa", latitude: 6.5244, longitude: 3.3792 },
    { city: "Cairo", country: "Egypt", region: "Africa", latitude: 30.0444, longitude: 31.2357 },
    { city: "Sydney", country: "Australia", region: "Oceania", latitude: -33.8688, longitude: 151.2093 },
    { city: "Melbourne", country: "Australia", region: "Oceania", latitude: -37.8136, longitude: 144.9631 },
    { city: "Auckland", country: "New Zealand", region: "Oceania", latitude: -36.8485, longitude: 174.7633 },
  ].map((c, i) => ({
    id: `anon-${i}`,
    ...c,
    region: c.region as ElsaUsageLocation["region"],
    anonymous: true,
    weight: 0.4 + Math.random() * 0.4,
  })),
];

// Curated industry list — kept broad enough to cover most teams without
// devolving into free-text fragmentation. Seeded with industries used by
// existing locations plus common verticals we expect to see on the radar.
const curatedIndustries = [
  "Aerospace & Defense",
  "Agriculture",
  "Automotive",
  "Banking",
  "Biotech",
  "Construction",
  "Consulting",
  "Consumer Goods",
  "Cybersecurity",
  "E-commerce",
  "Education",
  "Energy & Utilities",
  "Engineering",
  "Financial Services",
  "Gaming",
  "Government & Public Sector",
  "Healthcare",
  "Hospitality & Travel",
  "Human Resources",
  "Insurance",
  "Legal",
  "Logistics",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Non-profit",
  "Oil & Gas",
  "Pharmaceuticals",
  "Real Estate",
  "Research",
  "Retail",
  "SaaS",
  "Software",
  "Supply Chain",
  "Telecommunications",
  "Transportation",
  "Workflow Consulting",
  "Other",
];

export const elsaIndustries = Array.from(
  new Set([
    ...curatedIndustries,
    ...(elsaUsageLocations.map((l) => l.industry).filter(Boolean) as string[]),
  ]),
).sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));


export const elsaRegions: ElsaUsageLocation["region"][] = [
  "Europe",
  "North America",
  "South America",
  "Asia",
  "Africa",
  "Oceania",
];
