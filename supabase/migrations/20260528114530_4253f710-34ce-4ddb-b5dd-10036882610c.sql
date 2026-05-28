-- Enum for region
DO $$ BEGIN
  CREATE TYPE public.radar_region AS ENUM ('Europe','North America','South America','Asia','Africa','Oceania');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE public.radar_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  city TEXT,
  country TEXT NOT NULL,
  region public.radar_region NOT NULL,
  anonymous BOOLEAN NOT NULL DEFAULT true,
  weight NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  company_name TEXT,
  company_logo_url TEXT,
  website_url TEXT,
  industry TEXT,
  description TEXT,
  using_since INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_locations_region ON public.radar_locations(region);
CREATE INDEX idx_radar_locations_anonymous ON public.radar_locations(anonymous);

-- Grants: public read, platform admins write (writes are also gated by RLS)
GRANT SELECT ON public.radar_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.radar_locations TO authenticated;
GRANT ALL ON public.radar_locations TO service_role;

-- RLS
ALTER TABLE public.radar_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view radar locations"
  ON public.radar_locations FOR SELECT
  USING (true);

CREATE POLICY "Platform admins can insert radar locations"
  ON public.radar_locations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins can update radar locations"
  ON public.radar_locations FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Platform admins can delete radar locations"
  ON public.radar_locations FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

-- Updated_at trigger
CREATE TRIGGER trg_radar_locations_updated_at
  BEFORE UPDATE ON public.radar_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: showcases
INSERT INTO public.radar_locations
  (latitude, longitude, city, country, region, anonymous, weight, company_name, industry, description, website_url, using_since, sort_order)
VALUES
  (52.367600,   4.904100, 'Amsterdam', 'Netherlands',    'Europe',        false, 1.00, 'Valence Works',     'Workflow Consulting', 'Building durable .NET workflow systems for regulated industries.',         'https://valence.works', 2022, 10),
  (51.507400,  -0.127800, 'London',    'United Kingdom', 'Europe',        false, 0.90, 'North Claims',      'Insurance',           'Automating end-to-end claims orchestration across legacy systems.',         NULL,                    2024, 20),
  (40.712800, -74.006000, 'New York',  'United States',  'North America', false, 0.90, 'Halberd Logistics', 'Supply Chain',        'Long-running shipment workflows with audit-grade event sourcing.',          NULL,                    2023, 30),
  (35.676200, 139.650300, 'Tokyo',     'Japan',          'Asia',          false, 0.80, 'Kiso Finance',      'FinTech',             'Settlement and reconciliation workflows for cross-border payments.',        NULL,                    2024, 40),
  (59.329300,  18.068600, 'Stockholm', 'Sweden',         'Europe',        false, 0.70, 'Polar Research',    'GovTech',             'Citizen-facing case workflows with full audit trail.',                      NULL,                    2023, 50),
  (49.282700, -123.120700, 'Vancouver','Canada',         'North America', false, 0.70, 'Sable Health',      'Healthcare',          'Patient intake and referral workflows across clinical networks.',           NULL,                    2024, 60);

-- Seed: anonymous markers
INSERT INTO public.radar_locations (latitude, longitude, city, country, region, anonymous, weight, sort_order) VALUES
  (52.520000,  13.405000, 'Berlin',       'Germany',              'Europe',        true, 0.60, 100),
  (48.856600,   2.352200, 'Paris',        'France',               'Europe',        true, 0.55, 101),
  (40.416800,  -3.703800, 'Madrid',       'Spain',                'Europe',        true, 0.50, 102),
  (41.902800,  12.496400, 'Rome',         'Italy',                'Europe',        true, 0.50, 103),
  (52.229700,  21.012200, 'Warsaw',       'Poland',               'Europe',        true, 0.45, 104),
  (60.169900,  24.938400, 'Helsinki',     'Finland',              'Europe',        true, 0.45, 105),
  (38.722300,  -9.139300, 'Lisbon',       'Portugal',             'Europe',        true, 0.45, 106),
  (47.376900,   8.541700, 'Zurich',       'Switzerland',          'Europe',        true, 0.55, 107),
  (53.349800,  -6.260300, 'Dublin',       'Ireland',              'Europe',        true, 0.50, 108),
  (50.850300,   4.351700, 'Brussels',     'Belgium',              'Europe',        true, 0.45, 109),
  (48.208200,  16.373800, 'Vienna',       'Austria',              'Europe',        true, 0.45, 110),
  (50.075500,  14.437800, 'Prague',       'Czechia',              'Europe',        true, 0.45, 111),
  (37.774900, -122.419400, 'San Francisco','United States',       'North America', true, 0.70, 112),
  (47.606200, -122.332100, 'Seattle',     'United States',        'North America', true, 0.60, 113),
  (30.267200,  -97.743100, 'Austin',      'United States',        'North America', true, 0.55, 114),
  (41.878100,  -87.629800, 'Chicago',     'United States',        'North America', true, 0.55, 115),
  (42.360100,  -71.058900, 'Boston',      'United States',        'North America', true, 0.55, 116),
  (43.653200,  -79.383200, 'Toronto',     'Canada',               'North America', true, 0.55, 117),
  (45.501700,  -73.567300, 'Montreal',    'Canada',               'North America', true, 0.45, 118),
  (19.432600,  -99.133200, 'Mexico City', 'Mexico',               'North America', true, 0.50, 119),
  (-23.550500, -46.633300, 'São Paulo',   'Brazil',               'South America', true, 0.55, 120),
  (-34.603700, -58.381600, 'Buenos Aires','Argentina',            'South America', true, 0.50, 121),
  (4.711000,   -74.072100, 'Bogotá',      'Colombia',             'South America', true, 0.45, 122),
  (-33.448900, -70.669300, 'Santiago',    'Chile',                'South America', true, 0.45, 123),
  (1.352100,  103.819800, 'Singapore',   'Singapore',            'Asia',          true, 0.65, 124),
  (12.971600,  77.594600, 'Bangalore',   'India',                'Asia',          true, 0.65, 125),
  (19.076000,  72.877700, 'Mumbai',      'India',                'Asia',          true, 0.55, 126),
  (37.566500, 126.978000, 'Seoul',       'South Korea',          'Asia',          true, 0.55, 127),
  (22.319300, 114.169400, 'Hong Kong',   'Hong Kong',            'Asia',          true, 0.50, 128),
  (31.230400, 121.473700, 'Shanghai',    'China',                'Asia',          true, 0.55, 129),
  (25.204800,  55.270800, 'Dubai',       'United Arab Emirates', 'Asia',          true, 0.55, 130),
  (32.085300,  34.781800, 'Tel Aviv',    'Israel',               'Asia',          true, 0.50, 131),
  (41.008200,  28.978400, 'Istanbul',    'Türkiye',              'Asia',          true, 0.50, 132),
  (-33.924900, 18.424100, 'Cape Town',   'South Africa',         'Africa',        true, 0.45, 133),
  (-1.292100,  36.821900, 'Nairobi',     'Kenya',                'Africa',        true, 0.45, 134),
  (6.524400,    3.379200, 'Lagos',       'Nigeria',              'Africa',        true, 0.50, 135),
  (30.044400,  31.235700, 'Cairo',       'Egypt',                'Africa',        true, 0.50, 136),
  (-33.868800, 151.209300, 'Sydney',     'Australia',            'Oceania',       true, 0.55, 137),
  (-37.813600, 144.963100, 'Melbourne',  'Australia',            'Oceania',       true, 0.50, 138),
  (-36.848500, 174.763300, 'Auckland',   'New Zealand',          'Oceania',       true, 0.45, 139);
